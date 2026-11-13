import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const { ids } = await getScope(session.user.id)

  const now = new Date()
  const months: { start: Date; end: Date; label: string }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    months.push({ start, end, label: MONTH_LABELS[start.getMonth()] })
  }

  // One query for the whole 8-month window, bucketed in memory
  // (was 16 separate aggregate queries).
  const rangeStart = months[0].start
  const rows = await prisma.transaction.findMany({
    where: { userId: { in: ids }, date: { gte: rangeStart } },
    select: { amount: true, type: true, date: true },
  })

  const monthlyData = months.map(({ start, end, label }) => ({
    month: label,
    income: 0,
    expense: 0,
    _start: start.getTime(),
    _end: end.getTime(),
  }))
  for (const r of rows) {
    const t = new Date(r.date).getTime()
    const bucket = monthlyData.find((m) => t >= m._start && t < m._end)
    if (!bucket) continue
    if (r.type === "income") bucket.income += Number(r.amount)
    else if (r.type === "expense") bucket.expense += Number(r.amount)
  }

  // Heat map: total expense per weekday for the last 8 weeks
  const eightWeeksAgo = new Date(now)
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
  const recentExpenses = rows.filter(
    (r) => r.type === "expense" && new Date(r.date) >= eightWeeksAgo
  )

  const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const heatmap = weekdayLabels.map((day) => ({ day, total: 0 }))
  for (const t of recentExpenses) {
    const idx = new Date(t.date).getDay()
    heatmap[idx].total += Number(t.amount)
  }

  // Simple heuristic insights based on this month vs. last month
  const thisMonth = monthlyData[monthlyData.length - 1]
  const lastMonth = monthlyData[monthlyData.length - 2]
  const insights: string[] = []

  if (lastMonth && lastMonth.expense > 0) {
    const change = ((thisMonth.expense - lastMonth.expense) / lastMonth.expense) * 100
    if (change > 10) {
      insights.push(
        `Suas despesas subiram ${change.toFixed(0)}% em relação ao mês anterior. Vale revisar os gastos recentes.`
      )
    } else if (change < -10) {
      insights.push(
        `Você reduziu suas despesas em ${Math.abs(change).toFixed(0)}% em relação ao mês anterior. Bom trabalho!`
      )
    }
  }

  if (thisMonth.income > 0) {
    const savingsRate = ((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100
    insights.push(
      savingsRate >= 0
        ? `Você está economizando cerca de ${savingsRate.toFixed(0)}% da sua renda este mês.`
        : `Suas despesas superaram sua renda este mês em ${Math.abs(savingsRate).toFixed(0)}%. Considere revisar o orçamento.`
    )
  }

  if (insights.length === 0) {
    insights.push("Ainda não há transações suficientes este mês para gerar insights. Adicione algumas transações para ver análises aqui.")
  }

  return NextResponse.json({
    monthlyData: monthlyData.map(({ month, income, expense }) => ({ month, income, expense })),
    heatmap,
    insights,
  })
}

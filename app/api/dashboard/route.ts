import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"
import { resolvePeriod, buildBuckets, bucketKey } from "@/lib/period"
import { syncDue } from "@/lib/finance"

// null when there is nothing to compare against (never invent a percentage).
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1))
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const { ids, shared } = await getScope(session.user.id)
  await syncDue(ids)

  const sp = req.nextUrl.searchParams
  const period = resolvePeriod(sp.get("range"), sp.get("from"), sp.get("to"))
  const where = { userId: { in: ids } }

  const [walletAgg, investments, rows, prevGroups, recent, goals] = await Promise.all([
    prisma.wallet.aggregate({ where, _sum: { balance: true } }),
    prisma.investment.findMany({
      where,
      select: { type: true, quantity: true, avgPrice: true, currentPrice: true },
    }),
    prisma.transaction.findMany({
      where: { ...where, date: { gte: period.start, lt: period.end } },
      select: { amount: true, type: true, date: true, category: { select: { name: true, color: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { ...where, date: { gte: period.prevStart, lt: period.prevEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { category: true, user: { select: { name: true } } },
    }),
    prisma.goal.findMany({
      where: { ...where, status: "active" },
      orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
      take: 3,
    }),
  ])

  // Period totals, series and expense-by-category in a single pass.
  const buckets = buildBuckets(period.start, period.end, period.bucket)
  const series = buckets.map((b) => ({ key: b.key, label: b.label, income: 0, expense: 0 }))
  const index = new Map(series.map((s, i) => [s.key, i]))
  const byCategory = new Map<string, { name: string; color: string; value: number }>()
  let income = 0
  let expense = 0

  for (const r of rows) {
    const amount = Number(r.amount)
    const i = index.get(bucketKey(new Date(r.date), period.bucket))
    if (r.type === "income") {
      income += amount
      if (i !== undefined) series[i].income += amount
    } else if (r.type === "expense") {
      expense += amount
      if (i !== undefined) series[i].expense += amount
      const name = r.category?.name || "Sem categoria"
      const cur = byCategory.get(name) || { name, color: r.category?.color || "#6b7280", value: 0 }
      cur.value += amount
      byCategory.set(name, cur)
    }
  }

  let running = 0
  const seriesOut = series.map((s) => {
    const net = s.income - s.expense
    running += net
    return { label: s.label, income: s.income, expense: s.expense, net, cumulative: running }
  })

  const sorted = [...byCategory.values()].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, 6)
  const others = sorted.slice(6).reduce((acc, c) => acc + c.value, 0)
  if (others > 0) top.push({ name: "Outras", color: "#9ca3af", value: others })
  const categories = top.map((c) => ({
    ...c,
    percent: expense > 0 ? Number(((c.value / expense) * 100).toFixed(1)) : 0,
  }))

  const prevIncome = Number(prevGroups.find((g) => g.type === "income")?._sum.amount || 0)
  const prevExpense = Number(prevGroups.find((g) => g.type === "expense")?._sum.amount || 0)
  const savings = income - expense
  const prevSavings = prevIncome - prevExpense

  const totalBalance = Number(walletAgg._sum.balance || 0)
  const investmentsValue = investments.reduce((a, i) => a + Number(i.quantity) * Number(i.currentPrice), 0)
  const investmentsCost = investments.reduce((a, i) => a + Number(i.quantity) * Number(i.avgPrice), 0)

  const allocMap = new Map<string, number>()
  for (const i of investments) {
    allocMap.set(i.type, (allocMap.get(i.type) || 0) + Number(i.quantity) * Number(i.currentPrice))
  }

  return NextResponse.json({
    period: {
      range: period.range,
      label: period.label,
      bucket: period.bucket,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
    shared,
    totalBalance,
    investmentsValue,
    investmentsChange: pctChange(investmentsValue, investmentsCost),
    netWorth: totalBalance + investmentsValue,
    income,
    expense,
    savings,
    savingsRate: income > 0 ? Number(((savings / income) * 100).toFixed(1)) : null,
    changes: {
      income: pctChange(income, prevIncome),
      expense: pctChange(expense, prevExpense),
      savings: pctChange(savings, prevSavings),
    },
    series: seriesOut,
    categories,
    allocation: [...allocMap.entries()].map(([type, value]) => ({ type, value })),
    goals: goals.map((g) => {
      const target = Number(g.targetAmount)
      const current = Number(g.currentAmount)
      return {
        id: g.id,
        name: g.name,
        target,
        current,
        progress: target > 0 ? Math.min(100, Number(((current / target) * 100).toFixed(1))) : 0,
        deadline: g.deadline,
      }
    }),
    recent: recent.map((t) => ({
      id: t.id,
      description: t.description || "",
      amount: Number(t.amount),
      type: t.type,
      date: t.date,
      category: t.type.startsWith("transfer") ? "Transferência" : t.category?.name || "Sem categoria",
      categoryColor: t.type.startsWith("transfer") ? "#6366f1" : t.category?.color || "#6b7280",
      isMine: t.userId === session.user.id,
      owner: shared ? t.user?.name || "Parceiro(a)" : null,
    })),
    hasData: rows.length > 0 || recent.length > 0,
  })
}

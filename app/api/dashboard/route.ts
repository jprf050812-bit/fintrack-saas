import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function monthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
  return { start, end }
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const [wallets, investments] = await Promise.all([
    prisma.wallet.findMany({ where: { userId } }),
    prisma.investment.findMany({ where: { userId } }),
  ])

  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance), 0)
  const investmentsValue = investments.reduce(
    (acc, i) => acc + Number(i.quantity) * Number(i.currentPrice),
    0
  )
  const investmentsCost = investments.reduce(
    (acc, i) => acc + Number(i.quantity) * Number(i.avgPrice),
    0
  )

  const thisMonth = monthRange(0)
  const lastMonth = monthRange(-1)

  const [incomeThis, expenseThis, incomeLast, expenseLast] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "income", date: { gte: thisMonth.start, lt: thisMonth.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "expense", date: { gte: thisMonth.start, lt: thisMonth.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "income", date: { gte: lastMonth.start, lt: lastMonth.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "expense", date: { gte: lastMonth.start, lt: lastMonth.end } },
      _sum: { amount: true },
    }),
  ])

  const monthlyIncome = Number(incomeThis._sum.amount || 0)
  const monthlyExpense = Number(expenseThis._sum.amount || 0)
  const monthlyIncomeLast = Number(incomeLast._sum.amount || 0)
  const monthlyExpenseLast = Number(expenseLast._sum.amount || 0)

  return NextResponse.json({
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    investments: investmentsValue,
    incomeChange: Number(pctChange(monthlyIncome, monthlyIncomeLast).toFixed(1)),
    expenseChange: Number(pctChange(monthlyExpense, monthlyExpenseLast).toFixed(1)),
    investmentChange: Number(pctChange(investmentsValue, investmentsCost).toFixed(1)),
  })
}

// Read-only access to the user's own data for the assistant (basic and AI modes).
// Every function receives the user ids already resolved on the server
// (the user, plus the partner only when the couple view is on).
import { prisma } from "@/lib/prisma"
import { resolvePeriod, type Period } from "@/lib/period"
import { brToday } from "@/lib/finance"

export type PeriodKey = "today" | "week" | "month" | "last_month" | "3months" | "year"

export function periodFromKey(key: PeriodKey | string): Period {
  if (key === "last_month") {
    const t = brToday()
    const start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1))
    const end = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))
    const p = resolvePeriod("custom", start.toISOString().slice(0, 10), new Date(+end - 86_400_000).toISOString().slice(0, 10))
    return { ...p, label: "no mês passado" }
  }
  const p = resolvePeriod(key)
  const labels: Record<string, string> = { today: "hoje", week: "nos últimos 7 dias", month: "neste mês", "3months": "nos últimos 3 meses", year: "neste ano" }
  return { ...p, label: labels[key] || p.label }
}

const num = (v: any) => Number(v || 0)

export async function totalsFor(ids: string[], start: Date, end: Date) {
  const where = { userId: { in: ids }, date: { gte: start, lt: end } }
  const [byType, byCat] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true }, _count: true }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...where, type: "expense" },
      _sum: { amount: true },
      _count: true,
    }),
  ])
  const ids2 = byCat.map((c: any) => c.categoryId).filter(Boolean) as string[]
  const cats = ids2.length
    ? await prisma.category.findMany({ where: { id: { in: ids2 } }, select: { id: true, name: true } })
    : []
  const income = num(byType.find((g: any) => g.type === "income")?._sum.amount)
  const expense = num(byType.find((g: any) => g.type === "expense")?._sum.amount)
  const categories = byCat
    .map((c: any) => ({
      name: c.categoryId ? cats.find((x: any) => x.id === c.categoryId)?.name || "Sem categoria" : "Sem categoria",
      value: num(c._sum.amount),
      count: c._count as number,
    }))
    .sort((a: any, b: any) => b.value - a.value)
  return {
    income,
    expense,
    savings: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : null,
    count: byType.reduce((a: number, g: any) => a + g._count, 0),
    categories,
  }
}

export async function spendingForCategory(ids: string[], start: Date, end: Date, categoryId: string) {
  const agg = await prisma.transaction.aggregate({
    where: { userId: { in: ids }, type: "expense", categoryId, date: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  })
  return { total: num(agg._sum.amount), count: agg._count }
}

export async function spendingByText(ids: string[], start: Date, end: Date, text: string) {
  const agg = await prisma.transaction.aggregate({
    where: {
      userId: { in: ids },
      type: "expense",
      date: { gte: start, lt: end },
      OR: [
        { description: { contains: text, mode: "insensitive" } },
        { notes: { contains: text, mode: "insensitive" } },
      ],
    },
    _sum: { amount: true },
    _count: true,
  })
  return { total: num(agg._sum.amount), count: agg._count }
}

export async function getBalances(ids: string[]) {
  const [wallets, investments] = await Promise.all([
    prisma.wallet.findMany({ where: { userId: { in: ids } }, orderBy: { createdAt: "asc" }, select: { name: true, balance: true } }),
    prisma.investment.findMany({ where: { userId: { in: ids } }, select: { quantity: true, currentPrice: true } }),
  ])
  const walletsOut = wallets.map((w: any) => ({ name: w.name as string, balance: num(w.balance) }))
  const total = walletsOut.reduce((a, w) => a + w.balance, 0)
  const invested = investments.reduce((a: number, i: any) => a + num(i.quantity) * num(i.currentPrice), 0)
  return { wallets: walletsOut, total, invested, netWorth: total + invested }
}

export async function listTransactions(
  ids: string[],
  o: { start?: Date; end?: Date; categoryName?: string; type?: "income" | "expense"; limit?: number; sort?: "recent" | "largest" }
) {
  const where: any = { userId: { in: ids }, type: o.type ? o.type : { in: ["income", "expense"] } }
  if (o.start && o.end) where.date = { gte: o.start, lt: o.end }
  if (o.categoryName) where.category = { name: { contains: o.categoryName, mode: "insensitive" } }
  const rows = await prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: o.sort === "largest" ? [{ amount: "desc" }] : [{ date: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(o.limit || 10, 1), 20),
  })
  return rows.map((t: any) => ({
    date: (t.date as Date).toISOString().slice(0, 10),
    type: t.type as string,
    amount: num(t.amount),
    description: (t.description as string | null) || "",
    category: t.category?.name || "Sem categoria",
  }))
}

export async function getGoals(ids: string[]) {
  const goals = await prisma.goal.findMany({ where: { userId: { in: ids }, status: "active" }, orderBy: { createdAt: "asc" }, take: 20 })
  return goals.map((g: any) => {
    const target = num(g.targetAmount)
    const current = num(g.currentAmount)
    return {
      name: g.name as string,
      target,
      current,
      progress: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
      deadline: g.deadline ? (g.deadline as Date).toISOString().slice(0, 10) : null,
    }
  })
}

export async function getBudgets(ids: string[]) {
  const p = periodFromKey("month")
  const budgets = await prisma.budget.findMany({ where: { userId: { in: ids } }, include: { category: { select: { name: true } } }, take: 30 })
  const spent = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId: { in: ids }, type: "expense", categoryId: { not: null }, date: { gte: p.start, lt: p.end } },
    _sum: { amount: true },
  })
  return budgets.map((b: any) => {
    const used = b.categoryId ? num(spent.find((s: any) => s.categoryId === b.categoryId)?._sum.amount) : 0
    const limit = num(b.amount)
    return {
      name: b.name as string,
      category: (b.category?.name as string) || null,
      limit,
      spent: used,
      percent: limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0,
    }
  })
}

export function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10
}

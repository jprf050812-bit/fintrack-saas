import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { brToday, syncDue } from "@/lib/finance"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const userId = session.user.id
  await syncDue([userId])

  const t = brToday()
  const start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))
  const end = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1))

  const [stored, budgets, spentRows] = await Promise.all([
    prisma.alert.findMany({ where: { userId, read: false }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.budget.findMany({ where: { userId, categoryId: { not: null } }, include: { category: true } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", categoryId: { not: null }, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ])

  // Spending alerts are computed from the real budgets and this month's expenses.
  const spentBy = new Map(spentRows.map((r) => [r.categoryId, Number(r._sum.amount || 0)]))
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const computed = budgets.flatMap((b) => {
    const limit = Number(b.amount)
    const spent = spentBy.get(b.categoryId) || 0
    if (limit <= 0) return []
    const pct = (spent / limit) * 100
    const name = b.category?.name || b.name
    if (pct >= 100) {
      return [{ id: `budget-${b.id}-over`, type: "warning", title: `Orçamento de ${name} estourado`, message: `Você gastou ${brl(spent)} de ${brl(limit)} neste mês (${Math.round(pct)}%).` }]
    }
    if (pct >= 80) {
      return [{ id: `budget-${b.id}-near`, type: "warning", title: `Orçamento de ${name} quase no limite`, message: `Você já usou ${Math.round(pct)}% (${brl(spent)} de ${brl(limit)}).` }]
    }
    return []
  })

  return NextResponse.json({ alerts: [...computed, ...stored] })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await req.json()
  const alert = await prisma.alert.findUnique({ where: { id } })

  if (!alert || alert.userId !== session.user.id) {
    return NextResponse.json({ error: "Alerta não encontrado" }, { status: 404 })
  }

  await prisma.alert.update({ where: { id }, data: { read: true } })

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  period: z.enum(["monthly", "weekly", "yearly"]).optional(),
  categoryId: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  })

  // Compute "spent" live from this month's transactions in the same category,
  // rather than trusting a stored counter that can drift out of sync.
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const result = await Promise.all(
    budgets.map(async (b) => {
      let spent = 0
      if (b.categoryId) {
        const agg = await prisma.transaction.aggregate({
          where: {
            userId,
            type: "expense",
            categoryId: b.categoryId,
            date: { gte: start, lt: end },
          },
          _sum: { amount: true },
        })
        spent = Number(agg._sum.amount || 0)
      }
      return {
        id: b.id,
        name: b.name,
        amount: Number(b.amount),
        spent,
        period: b.period,
        category: b.category?.name || null,
      }
    })
  )

  return NextResponse.json({ budgets: result })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 }
    )
  }

  const { name, amount, period, categoryId } = parsed.data
  const now = new Date()

  const budget = await prisma.budget.create({
    data: {
      name,
      amount,
      period: period || "monthly",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      userId: session.user.id,
      categoryId: categoryId || null,
    },
  })

  return NextResponse.json({ success: true, budget }, { status: 201 })
}

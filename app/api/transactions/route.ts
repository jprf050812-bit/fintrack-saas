import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"

const createSchema = z.object({
  description: z.string().max(200).optional(),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().optional().nullable(),
  walletId: z.string().optional().nullable(),
  date: z.string().optional(),
  status: z.enum(["completed", "pending"]).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { ids, shared } = await getScope(session.user.id)
  const transactions = await prisma.transaction.findMany({
    where: { userId: { in: ids } },
    include: { category: true, user: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 200,
  })

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      status: t.status,
      date: t.date,
      category: t.category?.name || "Sem categoria",
      categoryColor: t.category?.color || "#6b7280",
      isMine: t.userId === session.user.id,
      owner: shared ? t.user?.name || "Parceiro(a)" : null,
    })),
  })
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

  const { description, amount, type, categoryId, date, status } = parsed.data

  // Use the given wallet (only if it is the user's) or fall back to the
  // user's first wallet, creating one if needed, so balances always update.
  let wallet = parsed.data.walletId
    ? await prisma.wallet.findFirst({ where: { id: parsed.data.walletId, userId: session.user.id } })
    : null
  if (!wallet) {
    wallet = await prisma.wallet.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    })
  }
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { name: "Carteira Principal", type: "checking", balance: 0, userId: session.user.id },
    })
  }
  const walletId = wallet.id

  const transaction = await prisma.transaction.create({
    data: {
      description,
      amount,
      type,
      status: status || "completed",
      date: date ? new Date(date) : new Date(),
      userId: session.user.id,
      categoryId: categoryId || null,
      walletId: walletId || null,
    },
    include: { category: true },
  })

  // Keep wallet balance in sync
  if (walletId) {
    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: {
          increment: type === "income" ? amount : -amount,
        },
      },
    })
  }

  return NextResponse.json({
    success: true,
    transaction: {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      category: transaction.category?.name || "Sem categoria",
      categoryColor: transaction.category?.color || "#6b7280",
    },
  })
}

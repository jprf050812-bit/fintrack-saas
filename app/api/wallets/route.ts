import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"

const WALLET_TYPES = ["checking", "savings", "cash", "credit_card", "investment"] as const

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da conta").max(50),
  type: z.enum(WALLET_TYPES).default("checking"),
  balance: z.number().min(-999_999_999).max(999_999_999).default(0),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // ?own=1 -> only the user's wallets (needed for forms: you can only move money in your own accounts)
  const own = req.nextUrl.searchParams.get("own") === "1"
  const { ids } = own ? { ids: [session.user.id] } : await getScope(session.user.id)
  let wallets = await prisma.wallet.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: "asc" },
  })

  // Safety net: accounts without a wallet get one on first request.
  if (wallets.length === 0) {
    const wallet = await prisma.wallet.create({
      data: { name: "Carteira Principal", type: "checking", balance: 0, userId: session.user.id },
    })
    wallets = [wallet]
  }

  return NextResponse.json({
    wallets: wallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: Number(w.balance),
      isMine: w.userId === session.user.id,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 })
  }

  const count = await prisma.wallet.count({ where: { userId: session.user.id } })
  if (count >= 20) {
    return NextResponse.json({ error: "Limite de 20 contas atingido" }, { status: 400 })
  }

  const wallet = await prisma.wallet.create({
    data: { ...parsed.data, userId: session.user.id },
  })
  return NextResponse.json({ success: true, wallet: { id: wallet.id } }, { status: 201 })
}

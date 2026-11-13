import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["stock", "fii", "crypto", "etf", "fixed_income"]),
  ticker: z.string().max(20).optional().nullable(),
  quantity: z.number().positive(),
  avgPrice: z.number().min(0),
  currentPrice: z.number().min(0).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { ids } = await getScope(session.user.id)
  const investments = await prisma.investment.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    investments: investments.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      ticker: i.ticker,
      quantity: Number(i.quantity),
      avgPrice: Number(i.avgPrice),
      currentPrice: Number(i.currentPrice),
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

  const { name, type, ticker, quantity, avgPrice, currentPrice } = parsed.data

  const investment = await prisma.investment.create({
    data: {
      name,
      type,
      ticker: ticker || null,
      quantity,
      avgPrice,
      currentPrice: currentPrice ?? avgPrice,
      userId: session.user.id,
      assetTransactions: {
        create: {
          type: "buy",
          quantity,
          price: avgPrice,
        },
      },
    },
  })

  return NextResponse.json({ success: true, investment }, { status: 201 })
}

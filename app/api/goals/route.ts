import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"

const createSchema = z.object({
  name: z.string().min(1).max(120),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { ids } = await getScope(session.user.id)
  const goals = await prisma.goal.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      deadline: g.deadline,
      status: g.status,
      isMine: g.userId === session.user.id,
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

  const { name, targetAmount, currentAmount, deadline } = parsed.data

  const goal = await prisma.goal.create({
    data: {
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      deadline: deadline ? new Date(deadline) : null,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ success: true, goal }, { status: 201 })
}

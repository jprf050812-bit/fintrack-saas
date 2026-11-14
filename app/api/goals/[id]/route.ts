import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseDateOnly } from "@/lib/finance"

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetAmount: z.number().positive("Informe um valor maior que zero").max(999_999_999).optional(),
  currentAmount: z.number().min(0).max(999_999_999).optional(),
  addAmount: z.number().positive().max(999_999_999).optional(), // contribute to the goal
  deadline: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 })
  }
  const d = parsed.data

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!goal) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 })

  let deadline: Date | null | undefined = undefined
  if (d.deadline !== undefined) {
    deadline = d.deadline ? parseDateOnly(d.deadline) : null
    if (d.deadline && !deadline) return NextResponse.json({ error: "Data inválida" }, { status: 400 })
  }

  const target = d.targetAmount ?? Number(goal.targetAmount)
  let current = d.currentAmount ?? Number(goal.currentAmount)
  if (d.addAmount) current += d.addAmount

  await prisma.goal.update({
    where: { id: goal.id },
    data: {
      name: d.name,
      targetAmount: d.targetAmount,
      currentAmount: d.currentAmount !== undefined || d.addAmount ? current : undefined,
      deadline,
      status: current >= target ? "completed" : "active",
    },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const res = await prisma.goal.deleteMany({ where: { id: params.id, userId: session.user.id } })
  if (res.count === 0) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validCategory } from "@/lib/finance"

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  amount: z.number().positive("Informe um valor maior que zero").max(999_999_999).optional(),
  categoryId: z.string().optional().nullable(),
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
  if (d.categoryId && !(await validCategory(session.user.id, d.categoryId))) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
  }
  const res = await prisma.budget.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { name: d.name, amount: d.amount, categoryId: d.categoryId === undefined ? undefined : d.categoryId || null },
  })
  if (res.count === 0) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const res = await prisma.budget.deleteMany({ where: { id: params.id, userId: session.user.id } })
  if (res.count === 0) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
  return NextResponse.json({ success: true })
}

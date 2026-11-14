import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const patchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// Only the user's own custom categories can be changed; defaults are shared.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const res = await prisma.category.updateMany({
    where: { id: params.id, userId: session.user.id, isDefault: false },
    data: parsed.data,
  })
  if (res.count === 0) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })
  return NextResponse.json({ success: true })
}

// Transactions and budgets using it become "Sem categoria" (FK is SET NULL).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id
  const cat = await prisma.category.findFirst({ where: { id: params.id, userId, isDefault: false } })
  if (!cat) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })

  await prisma.$transaction([
    prisma.recurringRule.updateMany({ where: { userId, categoryId: cat.id }, data: { categoryId: null } }),
    prisma.category.delete({ where: { id: cat.id } }),
  ])
  return NextResponse.json({ success: true })
}

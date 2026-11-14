import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const patchSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  type: z.enum(["checking", "savings", "cash", "credit_card", "investment"]).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
  const res = await prisma.wallet.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: parsed.data,
  })
  if (res.count === 0) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
  return NextResponse.json({ success: true })
}

// Only empty accounts can be deleted, so no transaction history is ever orphaned.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id
  const wallet = await prisma.wallet.findFirst({ where: { id: params.id, userId } })
  if (!wallet) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

  const [total, used] = await Promise.all([
    prisma.wallet.count({ where: { userId } }),
    prisma.transaction.count({ where: { walletId: wallet.id } }),
  ])
  if (total <= 1) {
    return NextResponse.json({ error: "Você precisa manter pelo menos uma conta" }, { status: 400 })
  }
  if (used > 0) {
    return NextResponse.json({ error: "Esta conta tem movimentações e não pode ser excluída" }, { status: 400 })
  }
  await prisma.wallet.delete({ where: { id: wallet.id } })
  return NextResponse.json({ success: true })
}

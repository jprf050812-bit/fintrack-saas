import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  PAYMENT_METHODS,
  parseDateOnly,
  signedAmount,
  statusForDate,
  validCategory,
} from "@/lib/finance"

const patchSchema = z.object({
  description: z.string().trim().max(200).optional().nullable(),
  amount: z.number().positive("Informe um valor maior que zero").max(999_999_999).optional(),
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().optional().nullable(),
  walletId: z.string().optional().nullable(),
  date: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx || tx.userId !== userId) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 })
  }
  const d = parsed.data
  const isTransfer = tx.type === "transfer_in" || tx.type === "transfer_out"

  if (isTransfer && (d.amount !== undefined || d.type || d.walletId || d.categoryId || d.date)) {
    return NextResponse.json(
      { error: "Transferências só permitem editar descrição e observações. Exclua e crie de novo para mudar valores." },
      { status: 400 }
    )
  }

  let newDate = tx.date
  if (d.date) {
    const p = parseDateOnly(d.date)
    if (!p) return NextResponse.json({ error: "Data inválida" }, { status: 400 })
    newDate = p
  }
  if (d.categoryId !== undefined && !(await validCategory(userId, d.categoryId))) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
  }
  if (d.walletId) {
    const w = await prisma.wallet.findFirst({ where: { id: d.walletId, userId }, select: { id: true } })
    if (!w) return NextResponse.json({ error: "Carteira inválida" }, { status: 400 })
  }

  const newType = d.type ?? tx.type
  const newAmount = d.amount ?? Number(tx.amount)
  const newWalletId = d.walletId !== undefined ? d.walletId : tx.walletId
  const newStatus = isTransfer ? tx.status : statusForDate(newDate)

  await prisma.$transaction(async (db) => {
    // Undo the old balance effect, then apply the new one.
    if (tx.status === "completed" && tx.walletId) {
      await db.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: -signedAmount(tx.type, Number(tx.amount)) } },
      })
    }
    await db.transaction.update({
      where: { id: tx.id },
      data: {
        description: d.description !== undefined ? d.description || null : undefined,
        amount: isTransfer ? undefined : newAmount,
        type: isTransfer ? undefined : newType,
        categoryId: d.categoryId !== undefined ? d.categoryId || null : undefined,
        walletId: isTransfer ? undefined : newWalletId,
        date: isTransfer ? undefined : newDate,
        status: newStatus,
        paymentMethod: d.paymentMethod !== undefined ? d.paymentMethod || null : undefined,
        notes: d.notes !== undefined ? d.notes || null : undefined,
      },
    })
    if (newStatus === "completed" && (isTransfer ? tx.walletId : newWalletId)) {
      await db.wallet.update({
        where: { id: (isTransfer ? tx.walletId : newWalletId)! },
        data: { balance: { increment: signedAmount(isTransfer ? tx.type : newType, isTransfer ? Number(tx.amount) : newAmount) } },
      })
    }
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/transactions/:id            -> only this one
// DELETE /api/transactions/:id?scope=group -> every installment of the purchase
// Transfers are always deleted together (both legs).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx || tx.userId !== userId) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
  }

  const wantsGroup = req.nextUrl.searchParams.get("scope") === "group"
  let where: any = { id: tx.id, userId }
  if (tx.transferGroupId) where = { transferGroupId: tx.transferGroupId, userId }
  else if (wantsGroup && tx.installmentGroupId) where = { installmentGroupId: tx.installmentGroupId, userId }

  await prisma.$transaction(async (db) => {
    const rows = await db.transaction.findMany({ where })
    for (const r of rows) {
      if (r.status === "completed" && r.walletId) {
        await db.wallet
          .update({
            where: { id: r.walletId },
            data: { balance: { increment: -signedAmount(r.type, Number(r.amount)) } },
          })
          .catch(() => {})
      }
    }
    await db.transaction.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } })
  })

  return NextResponse.json({ success: true })
}

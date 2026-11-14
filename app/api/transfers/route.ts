import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { randomUUID } from "crypto"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { brToday, parseDateOnly, statusForDate } from "@/lib/finance"

const schema = z.object({
  fromWalletId: z.string(),
  toWalletId: z.string(),
  amount: z.number().positive("Informe um valor maior que zero").max(999_999_999),
  date: z.string().optional(),
  description: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 })
  }
  const d = parsed.data
  if (d.fromWalletId === d.toWalletId) {
    return NextResponse.json({ error: "Escolha duas contas diferentes" }, { status: 400 })
  }

  let date = brToday()
  if (d.date) {
    const p = parseDateOnly(d.date)
    if (!p) return NextResponse.json({ error: "Data inválida" }, { status: 400 })
    date = p
  }

  const wallets = await prisma.wallet.findMany({
    where: { id: { in: [d.fromWalletId, d.toWalletId] }, userId },
    select: { id: true, name: true },
  })
  const from = wallets.find((w) => w.id === d.fromWalletId)
  const to = wallets.find((w) => w.id === d.toWalletId)
  if (!from || !to) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 400 })
  }

  const status = statusForDate(date)
  const groupId = randomUUID()
  const common = { userId, amount: d.amount, date, status, transferGroupId: groupId, notes: d.notes || null }

  await prisma.$transaction(async (db) => {
    await db.transaction.create({
      data: { ...common, type: "transfer_out", walletId: from.id, description: d.description || `Transferência para ${to.name}` },
    })
    await db.transaction.create({
      data: { ...common, type: "transfer_in", walletId: to.id, description: d.description || `Transferência de ${from.name}` },
    })
    if (status === "completed") {
      await db.wallet.update({ where: { id: from.id }, data: { balance: { decrement: d.amount } } })
      await db.wallet.update({ where: { id: to.id }, data: { balance: { increment: d.amount } } })
    }
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

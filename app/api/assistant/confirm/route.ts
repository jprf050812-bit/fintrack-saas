import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSingleTransaction, parseDateOnly, validCategory } from "@/lib/finance"

const schema = z.object({
  messageId: z.string(),
  action: z.enum(["confirm", "cancel"]),
  categoryId: z.string().optional().nullable(),
})

// The proposal is read from the database (saved with the assistant message),
// never from the request, so the client cannot change the amount or type.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  const { messageId, action, categoryId } = parsed.data

  const msg = await prisma.chatMessage.findFirst({ where: { id: messageId, userId, role: "assistant" } })
  const proposal = (msg?.context as any)?.proposal
  if (!msg || !proposal) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 })

  const pendingFilter = { path: ["proposal", "status"], equals: "pending" }
  const setStatus = (status: string, extra: object = {}) =>
    prisma.chatMessage.update({ where: { id: msg.id }, data: { context: { proposal: { ...proposal, ...extra, status } } as any } })

  if (action === "cancel") {
    const res = await prisma.chatMessage.updateMany({ where: { id: msg.id, userId, context: pendingFilter as any }, data: { context: { proposal: { ...proposal, status: "cancelled" } } as any } })
    if (res.count === 0) return NextResponse.json({ error: "Esta proposta já foi respondida" }, { status: 409 })
    return NextResponse.json({ success: true, message: "Tudo bem, não registrei nada." })
  }

  const chosenCategory = categoryId !== undefined ? categoryId || null : proposal.categoryId
  if (chosenCategory) {
    const cat = await prisma.category.findFirst({
      where: { id: chosenCategory, type: proposal.type, OR: [{ isDefault: true }, { userId }] },
      select: { id: true },
    })
    if (!cat || !(await validCategory(userId, chosenCategory))) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
    }
  }
  const date = parseDateOnly(proposal.date)
  if (!date) return NextResponse.json({ error: "Data da proposta inválida" }, { status: 400 })

  // Claim the proposal first so a double tap cannot register it twice.
  const claim = await prisma.chatMessage.updateMany({
    where: { id: msg.id, userId, context: pendingFilter as any },
    data: { context: { proposal: { ...proposal, categoryId: chosenCategory, status: "processing" } } as any },
  })
  if (claim.count === 0) return NextResponse.json({ error: "Esta proposta já foi respondida" }, { status: 409 })

  try {
    const tx = await createSingleTransaction(userId, {
      type: proposal.type,
      amount: Number(proposal.amount),
      description: proposal.description || null,
      categoryId: chosenCategory,
      date,
    })
    await setStatus("confirmed", { categoryId: chosenCategory, transactionId: tx.id })
    return NextResponse.json({ success: true, message: "Registrado! O saldo e os indicadores já foram atualizados.", transactionId: tx.id })
  } catch {
    await setStatus("pending")
    return NextResponse.json({ error: "Não foi possível registrar agora. Nada foi salvo." }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
  })

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
  }

  if (transaction.walletId) {
    await prisma.wallet.update({
      where: { id: transaction.walletId },
      data: {
        balance: {
          increment: transaction.type === "income" ? -Number(transaction.amount) : Number(transaction.amount),
        },
      },
    })
  }

  await prisma.transaction.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}

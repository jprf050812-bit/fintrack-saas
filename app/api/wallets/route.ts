import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  let wallets = await prisma.wallet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  })

  // Safety net: older accounts (or accounts created before this feature)
  // might not have a wallet yet — create one on first request.
  if (wallets.length === 0) {
    const wallet = await prisma.wallet.create({
      data: {
        name: "Carteira Principal",
        type: "checking",
        balance: 0,
        userId: session.user.id,
      },
    })
    wallets = [wallet]
  }

  return NextResponse.json({
    wallets: wallets.map((w) => ({ ...w, balance: Number(w.balance) })),
  })
}

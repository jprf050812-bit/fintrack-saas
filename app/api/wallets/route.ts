import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { ids } = await getScope(session.user.id)
  let wallets = await prisma.wallet.findMany({
    where: { userId: { in: ids } },
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

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Stops a recurrence. Transactions already generated are kept.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const res = await prisma.recurringRule.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { active: false },
  })
  if (res.count === 0) {
    return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}

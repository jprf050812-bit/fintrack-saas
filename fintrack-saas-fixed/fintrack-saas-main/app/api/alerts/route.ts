import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ alerts })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await req.json()
  const alert = await prisma.alert.findUnique({ where: { id } })

  if (!alert || alert.userId !== session.user.id) {
    return NextResponse.json({ error: "Alerta não encontrado" }, { status: 404 })
  }

  await prisma.alert.update({ where: { id }, data: { read: true } })

  return NextResponse.json({ success: true })
}

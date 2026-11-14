import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { nextDate: "asc" },
  })
  const catIds = Array.from(new Set(rules.map((r) => r.categoryId).filter(Boolean))) as string[]
  const cats = catIds.length
    ? await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    : []

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      description: r.description,
      category: cats.find((c) => c.id === r.categoryId)?.name || "Sem categoria",
      frequency: r.frequency,
      nextDate: r.nextDate,
      endDate: r.endDate,
    })),
  })
}

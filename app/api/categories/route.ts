import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria").max(40),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").default("#3b82f6"),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const categories = await prisma.category.findMany({
    where: { OR: [{ isDefault: true }, { userId: session.user.id }] },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 })
  }
  const d = parsed.data

  const dup = await prisma.category.findFirst({
    where: {
      type: d.type,
      name: { equals: d.name, mode: "insensitive" },
      OR: [{ isDefault: true }, { userId }],
    },
  })
  if (dup) return NextResponse.json({ error: "Já existe uma categoria com esse nome" }, { status: 400 })

  const count = await prisma.category.count({ where: { userId } })
  if (count >= 50) return NextResponse.json({ error: "Limite de 50 categorias personalizadas" }, { status: 400 })

  const category = await prisma.category.create({ data: { ...d, userId, isDefault: false } })
  return NextResponse.json({ success: true, category }, { status: 201 })
}

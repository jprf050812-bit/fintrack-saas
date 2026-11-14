import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"
import { brToday, syncDue } from "@/lib/finance"
import { basicReply, type AssistantReply } from "@/lib/assistant/basic"
import { aiConfigured, aiReply } from "@/lib/assistant/llm"

export const maxDuration = 30

const HOURLY_LIMIT = 40

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const rows = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, role: true, content: true, context: true },
  })
  return NextResponse.json({
    mode: aiConfigured() ? "ai" : "basic",
    messages: rows.reverse().map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      proposal: (m.context as any)?.proposal || null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  if (!message || message.length > 500) {
    return NextResponse.json({ error: "Escreva uma mensagem de até 500 caracteres" }, { status: 400 })
  }

  // Per-user limit: protects the AI bill and the database.
  const recent = await prisma.chatMessage.count({
    where: { userId, role: "user", createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  })
  if (recent >= HOURLY_LIMIT) {
    return NextResponse.json({ error: "Muitas mensagens na última hora. Tente novamente mais tarde." }, { status: 429 })
  }

  const { ids } = await getScope(userId)
  await syncDue(ids)

  const categories = await prisma.category.findMany({
    where: { OR: [{ isDefault: true }, { userId }] },
    select: { id: true, name: true, type: true },
  })
  const todayIso = brToday().toISOString().slice(0, 10)

  let reply: AssistantReply
  let mode: "ai" | "basic" = "basic"
  if (aiConfigured()) {
    try {
      const past = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { role: true, content: true },
      })
      reply = await aiReply({ ids, message, history: past.reverse(), todayIso, cats: categories })
      mode = "ai"
    } catch {
      // AI unavailable (key invalid, quota, timeout): keep working in basic mode.
      reply = await basicReply({ ids, message, todayIso, cats: categories })
      reply.text = "(A IA está indisponível agora; respondi no modo básico.)\n" + reply.text
    }
  } else {
    reply = await basicReply({ ids, message, todayIso, cats: categories })
  }

  await prisma.chatMessage.create({ data: { userId, role: "user", content: message } })
  const saved = await prisma.chatMessage.create({
    data: {
      userId,
      role: "assistant",
      content: reply.text,
      context: reply.proposal ? ({ proposal: reply.proposal } as any) : undefined,
    },
  })

  return NextResponse.json({
    response: reply.text,
    messageId: saved.id,
    proposal: reply.proposal || null,
    mode,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const responses: Record<string, string> = {
  "oi": "Olá! Sou o FinBot, seu assistente financeiro. Como posso ajudar?",
  "investir": "Recomendo começar com fundo de emergência (3-6x renda) e diversificar entre renda fixa e variável.",
  "orçamento": "Tente a regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança/investimentos.",
  "dívida": "Priorize quitar dívidas com juros >1% ao mês. Use o método bola de neve ou avalanche.",
  "fii": "FIIs são ótimos para renda passiva mensal. Diversifique entre segmentos: logística, papel, shoppings, etc.",
  "cdb": "CDBs de bancos médios costumam pagar mais que os grandes. Verifique a proteção do FGC (até R$ 250 mil).",
  "ação": "Analise fundamentos (P/L, P/VP, DY) e não invista sem entender o negócio da empresa.",
  "meta": "Defina metas SMART: específicas, mensuráveis, atingíveis, relevantes e com prazo.",
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { message } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 })
    }

    const lower = message.toLowerCase()
    const fallback = Object.entries(responses).find(([k]) => lower.includes(k))
    const responseText = fallback
      ? fallback[1]
      : `Analisei sua pergunta sobre "${message}". Recomendo monitorar seus gastos fixos e manter a reserva de emergência atualizada. Quer que eu detalhe algum ponto específico?`

    if (session?.user?.id) {
      await prisma.chatMessage.createMany({
        data: [
          { userId: session.user.id, role: "user", content: message },
          { userId: session.user.id, role: "assistant", content: responseText },
        ],
      })
    }

    return NextResponse.json({ response: responseText })
  } catch {
    return NextResponse.json({ response: "Desculpe, ocorreu um erro. Tente novamente!" }, { status: 500 })
  }
}

// "Basic" assistant: no external AI. Understands a fixed set of questions and
// simple "gastei 45 no mercado" sentences, and answers ONLY from the user's data.
import { detectIntent, guessCategory, normalize, parseTransactionText, type Cat } from "@/lib/assistant/parse"
import {
  getBalances, getBudgets, getGoals, pct, periodFromKey, spendingByText, spendingForCategory, totalsFor,
} from "@/lib/assistant/data"

export interface Proposal {
  type: "income" | "expense"
  amount: number
  description: string
  categoryId: string | null
  categoryName: string | null
  date: string
  dateAssumed: boolean
  status: "pending" | "processing" | "confirmed" | "cancelled"
  transactionId?: string
}

export interface AssistantReply {
  text: string
  proposal?: Proposal
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const pc = (v: number) => String(v).replace(".", ",")
const sign = (n: number | null) => (n === null ? "sem base de comparação" : `${n > 0 ? "+" : ""}${pc(n)}%`)

export const HELP_TEXT =
  "Posso ajudar com:\n" +
  "• Registrar: \"gastei 45 reais no mercado hoje\" ou \"recebi 3000 de salário\"\n" +
  "• \"Resumo do mês\" (ou da semana, do ano)\n" +
  "• \"Quanto gastei com mercado?\"\n" +
  "• \"Maiores gastos\", \"Saldo\", \"Minhas metas\", \"Orçamentos\"\n" +
  "• \"Comparar com o mês passado\"\n" +
  "Antes de registrar qualquer coisa, eu sempre peço a sua confirmação."

export async function basicReply(opts: { ids: string[]; message: string; todayIso: string; cats: Cat[] }): Promise<AssistantReply> {
  const { ids, message, todayIso, cats } = opts
  const norm = normalize(message)
  const isQuestion = /\?/.test(message) || /^(quanto|qual|quais|como|onde)\b/.test(norm)

  // 1) Registering a transaction (never writes: returns a proposal to confirm)
  if (!isQuestion) {
    const parsed = parseTransactionText(message, todayIso, cats)
    if (parsed) {
      const kind = parsed.type === "expense" ? "despesa" : "receita"
      let text = `Entendi: ${kind} de ${brl(parsed.amount)}${parsed.description ? ` — ${parsed.description}` : ""}, em ${fmtDate(parsed.date)}.`
      if (parsed.dateAssumed) text += " Como você não informou a data, considerei hoje."
      if (!parsed.category) text += " Não consegui identificar a categoria: escolha uma no cartão."
      text += " Confirme abaixo para registrar."
      return {
        text,
        proposal: {
          type: parsed.type, amount: parsed.amount, description: parsed.description,
          categoryId: parsed.category?.id || null, categoryName: parsed.category?.name || null,
          date: parsed.date, dateAssumed: parsed.dateAssumed, status: "pending",
        },
      }
    }
    if (/\b(gastei|paguei|comprei|recebi|ganhei)\b/.test(norm)) {
      return { text: "Entendi que você quer registrar uma movimentação, mas não encontrei o valor. Qual foi o valor? Ex.: \"gastei 45 reais no mercado\"." }
    }
  }

  // 2) Questions answered from the user's data
  const intent = detectIntent(message)
  const period = periodFromKey(intent.period)

  switch (intent.kind) {
    case "summary": {
      const t = await totalsFor(ids, period.start, period.end)
      if (t.count === 0) return { text: `Não encontrei movimentações ${period.label}.` }
      const lines = [
        `Resumo (${period.label}):`,
        `• Receitas: ${brl(t.income)}`,
        `• Despesas: ${brl(t.expense)}`,
        `• Resultado: ${brl(t.savings)}${t.savingsRate !== null ? ` (${pc(t.savingsRate)}% da receita)` : ""}`,
      ]
      if (t.categories.length) {
        lines.push("Maiores categorias de despesa:")
        t.categories.slice(0, 3).forEach((c, i) =>
          lines.push(`${i + 1}. ${c.name} — ${brl(c.value)} (${t.expense > 0 ? Math.round((c.value / t.expense) * 100) : 0}%)`)
        )
      }
      return { text: lines.join("\n") }
    }

    case "top_expenses": {
      const t = await totalsFor(ids, period.start, period.end)
      if (t.categories.length === 0) return { text: `Não encontrei despesas ${period.label}.` }
      return {
        text: [`Onde você mais gastou (${period.label}):`, ...t.categories.slice(0, 5).map((c, i) =>
          `${i + 1}. ${c.name} — ${brl(c.value)} (${t.expense > 0 ? Math.round((c.value / t.expense) * 100) : 0}%)`)].join("\n"),
      }
    }

    case "category_spend": {
      const q = intent.categoryQuery || ""
      const nq = normalize(q)
      const byName = cats.filter((c) => c.type === "expense").find((c) => normalize(c.name) === nq || (nq.length >= 3 && normalize(c.name).includes(nq)))
      if (byName) {
        const r = await spendingForCategory(ids, period.start, period.end, byName.id)
        return { text: r.count === 0 ? `Não encontrei gastos na categoria ${byName.name} ${period.label}.` : `Você gastou ${brl(r.total)} na categoria ${byName.name} ${period.label} (${r.count} lançamento${r.count > 1 ? "s" : ""}).` }
      }
      const txt = await spendingByText(ids, period.start, period.end, q)
      if (txt.count > 0) return { text: `Você gastou ${brl(txt.total)} em lançamentos com "${q}" ${period.label} (${txt.count} lançamento${txt.count > 1 ? "s" : ""}).` }
      const guessed = guessCategory(q, "expense", cats)
      if (guessed) {
        const r = await spendingForCategory(ids, period.start, period.end, guessed.id)
        if (r.count > 0) return { text: `Não achei lançamentos com "${q}", mas na categoria ${guessed.name} você gastou ${brl(r.total)} ${period.label}.` }
      }
      return { text: `Não encontrei gastos com "${q}" ${period.label}.` }
    }

    case "compare": {
      const cur = periodFromKey("month")
      const prev = periodFromKey("last_month")
      const [a, b] = await Promise.all([totalsFor(ids, cur.start, cur.end), totalsFor(ids, prev.start, prev.end)])
      if (a.count === 0 && b.count === 0) return { text: "Não encontrei movimentações neste mês nem no mês passado." }
      const lines = [
        "Este mês × mês passado:",
        `• Receitas: ${brl(a.income)} × ${brl(b.income)} (${sign(pct(a.income, b.income))})`,
        `• Despesas: ${brl(a.expense)} × ${brl(b.expense)} (${sign(pct(a.expense, b.expense))})`,
        `• Resultado: ${brl(a.savings)} × ${brl(b.savings)}`,
      ]
      const deltas = a.categories.map((c) => ({ name: c.name, d: c.value - (b.categories.find((x) => x.name === c.name)?.value || 0) }))
      const up = deltas.sort((x, y) => y.d - x.d)[0]
      if (up && up.d > 0) lines.push(`Categoria que mais subiu: ${up.name} (+${brl(up.d)}).`)
      return { text: lines.join("\n") }
    }

    case "balance": {
      const b = await getBalances(ids)
      const lines = [`Saldo total das contas: ${brl(b.total)}`]
      b.wallets.forEach((w) => lines.push(`• ${w.name}: ${brl(w.balance)}`))
      if (b.invested > 0) lines.push(`Investimentos: ${brl(b.invested)}`, `Patrimônio total: ${brl(b.netWorth)}`)
      return { text: lines.join("\n") }
    }

    case "goals": {
      const g = await getGoals(ids)
      if (g.length === 0) return { text: "Você não tem metas ativas. Crie uma na aba Metas." }
      return { text: ["Suas metas ativas:", ...g.map((x) => `• ${x.name}: ${brl(x.current)} de ${brl(x.target)} (${pc(x.progress)}%)${x.deadline ? `, prazo ${fmtDate(x.deadline)}` : ""}`)].join("\n") }
    }

    case "budgets": {
      const b = await getBudgets(ids)
      if (b.length === 0) return { text: "Você não tem orçamentos criados. Crie um na aba Orçamentos." }
      return { text: ["Orçamentos deste mês:", ...b.map((x) => `• ${x.name}: ${brl(x.spent)} de ${brl(x.limit)} (${pc(x.percent)}%)${x.percent >= 100 ? " — estourado" : x.percent >= 80 ? " — quase no limite" : ""}`)].join("\n") }
    }

    case "help":
      return { text: HELP_TEXT }

    default:
      return { text: "Não entendi esse pedido e prefiro não inventar uma resposta.\n\n" + HELP_TEXT }
  }
}

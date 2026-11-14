// Deterministic understanding of simple Portuguese finance sentences.
// Used by the "basic" assistant mode (no external AI) and as a fallback.
// Pure functions only: no database, no network.

export interface Cat {
  id: string
  name: string
  type: string
}

export interface ParsedTx {
  type: "income" | "expense"
  amount: number
  description: string
  date: string // YYYY-MM-DD
  dateAssumed: boolean
  category: Cat | null
}

export type IntentKind =
  | "summary"
  | "category_spend"
  | "balance"
  | "top_expenses"
  | "compare"
  | "goals"
  | "budgets"
  | "help"
  | "unknown"

export interface Intent {
  kind: IntentKind
  period: "today" | "week" | "month" | "last_month" | "3months" | "year"
  categoryQuery: string | null
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

const pad = (n: number) => String(n).padStart(2, "0")
const iso = (d: Date) => d.toISOString().slice(0, 10)

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

function validIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const s = `${y}-${pad(m)}-${pad(d)}`
  const dt = new Date(`${s}T00:00:00Z`)
  return Number.isNaN(+dt) || iso(dt) !== s ? null : s
}

const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/
const DAY_RE = /\bdia\s+(\d{1,2})\b/

export function parseDate(text: string, todayIso: string): { date: string; assumed: boolean } {
  const n = normalize(text)
  if (/\banteontem\b/.test(n)) return { date: addDays(todayIso, -2), assumed: false }
  if (/\bontem\b/.test(n)) return { date: addDays(todayIso, -1), assumed: false }
  if (/\bhoje\b/.test(n)) return { date: todayIso, assumed: false }

  const full = n.match(DATE_RE)
  if (full) {
    const year = full[3] ? (full[3].length === 2 ? 2000 + Number(full[3]) : Number(full[3])) : Number(todayIso.slice(0, 4))
    const v = validIso(year, Number(full[2]), Number(full[1]))
    if (v) return { date: v, assumed: false }
    // A written date that does not exist (31/02) is not a guess we should make:
    // fall back to today and flag it so the user must confirm the date.
    return { date: todayIso, assumed: true }
  }

  const day = n.match(DAY_RE)
  if (day) {
    let y = Number(todayIso.slice(0, 4))
    let m = Number(todayIso.slice(5, 7))
    const d = Number(day[1])
    if (d > Number(todayIso.slice(8, 10))) {
      m -= 1
      if (m === 0) { m = 12; y -= 1 }
    }
    const v = validIso(y, m, d)
    if (v) return { date: v, assumed: false }
  }
  return { date: todayIso, assumed: true }
}

// Finds the money amount in the text, ignoring dates ("12/11") and "dia 12".
export function parseAmount(text: string): { value: number; raw: string } | null {
  const cleaned = text.replace(DATE_RE, " ").replace(/\bdia\s+\d{1,2}\b/gi, " ")

  const mil = cleaned.match(/(\d+(?:[.,]\d+)?)\s*mil\b/i)
  if (mil) {
    const v = Number(mil[1].replace(",", ".")) * 1000
    if (v > 0) return { value: Math.round(v * 100) / 100, raw: mil[0] }
  }

  const re = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real|conto|contos|pila|pilas))?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned))) {
    let num = m[1]
    if (num.includes(".") && num.includes(",")) num = num.replace(/\./g, "").replace(",", ".")
    else if (num.includes(",")) num = num.replace(",", ".")
    else if (/^\d{1,3}(\.\d{3})+$/.test(num)) num = num.replace(/\./g, "")
    const v = Number(num)
    if (Number.isFinite(v) && v > 0 && v < 1_000_000_000) return { value: Math.round(v * 100) / 100, raw: m[0] }
  }
  return null
}

const EXPENSE_VERB = /\b(gastei|paguei|comprei|despesa|saiu|gasto)\b/i
const INCOME_VERB = /\b(recebi|ganhei|entrou|recebimento|receita|sal[aá]rio)\b/i

const KEYWORDS: Array<{ category: string; type: "income" | "expense"; words: string[] }> = [
  { category: "alimentacao", type: "expense", words: ["mercado", "supermercado", "padaria", "restaurante", "lanche", "almoco", "jantar", "cafe", "ifood", "pizza", "hamburguer", "acougue", "feira", "comida"] },
  { category: "transporte", type: "expense", words: ["uber", "99", "taxi", "onibus", "metro", "gasolina", "combustivel", "estacionamento", "pedagio", "passagem"] },
  { category: "moradia", type: "expense", words: ["aluguel", "condominio", "luz", "energia", "agua", "internet", "gas", "iptu"] },
  { category: "lazer", type: "expense", words: ["cinema", "netflix", "spotify", "bar", "show", "viagem", "festa", "jogo", "streaming"] },
  { category: "saude", type: "expense", words: ["farmacia", "remedio", "medico", "consulta", "dentista", "exame"] },
  { category: "educacao", type: "expense", words: ["curso", "livro", "faculdade", "escola", "mensalidade"] },
  { category: "renda extra", type: "income", words: ["freela", "freelance", "extra", "bonus", "venda"] },
  { category: "investimentos", type: "income", words: ["dividendo", "dividendos", "rendimento", "juros"] },
  { category: "renda", type: "income", words: ["salario", "pagamento", "holerite"] },
]

export function guessCategory(text: string, type: "income" | "expense", cats: Cat[]): Cat | null {
  const n = normalize(text)
  const pool = cats.filter((c) => c.type === type)

  // 1) the user named one of their own categories
  const byName = pool
    .filter((c) => normalize(c.name).length >= 3 && new RegExp(`\\b${normalize(c.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(n))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (byName) return byName

  // 2) well-known keywords -> default category names
  for (const k of KEYWORDS.filter((k) => k.type === type)) {
    if (k.words.some((w) => new RegExp(`\\b${w}\\b`).test(n))) {
      const hit = pool.find((c) => normalize(c.name) === k.category) || pool.find((c) => normalize(c.name).startsWith(k.category))
      if (hit) return hit
    }
  }
  return null
}

const STRIP_LEADING = /^(?:(?:no|na|nos|nas|em|com|de|do|da|dos|das|para|pra|pro|o|a|os|as|um|uma|por)\b\s*)+/i

export function parseTransactionText(text: string, todayIso: string, cats: Cat[]): ParsedTx | null {
  const t = text.trim()
  const exp = t.match(EXPENSE_VERB)
  const inc = t.match(INCOME_VERB)
  if (!exp && !inc) return null

  let type: "income" | "expense"
  if (exp && inc) type = (exp.index ?? 0) <= (inc.index ?? 0) ? "expense" : "income"
  else type = exp ? "expense" : "income"

  const amount = parseAmount(t)
  if (!amount) return null

  const { date, assumed } = parseDate(t, todayIso)

  let desc = t
    .replace(EXPENSE_VERB, " ")
    .replace(INCOME_VERB, " ")
    .replace(amount.raw, " ")
    .replace(/r\$/gi, " ")
    .replace(DATE_RE, " ")
    .replace(/\bdia\s+\d{1,2}\b/gi, " ")
    .replace(/\b(hoje|ontem|anteontem)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(STRIP_LEADING, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim()
  if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1)

  const category = guessCategory(`${t}`, type, cats)
  return { type, amount: amount.value, description: desc.slice(0, 200), date, dateAssumed: assumed, category }
}

export function detectIntent(text: string): Intent {
  const n = normalize(text)

  let period: Intent["period"] = "month"
  if (/\bmes passado\b|\bultimo mes\b/.test(n)) period = "last_month"
  else if (/\bhoje\b/.test(n)) period = "today"
  else if (/\bsemana\b/.test(n)) period = "week"
  else if (/\b3 meses\b|\btres meses\b|\btrimestre\b/.test(n)) period = "3months"
  else if (/\bano\b/.test(n)) period = "year"

  const spend = n.match(/quanto\s+(?:eu\s+)?(?:gastei|gasto|paguei)\s+(?:com|em|no|na|nos|nas|de|do|da|para)?\s*(.+?)(?:\s+(?:hoje|esta semana|na semana|neste mes|este mes|no mes|mes passado|no ano|este ano)\b.*)?\??$/)
  if (spend && spend[1].trim()) {
    const q = spend[1].replace(/\b(hoje|este|esse|neste|nesse|mes|ano|semana)\b/g, "").replace(/[?.!]/g, "").trim()
    if (q) return { kind: "category_spend", period, categoryQuery: q }
  }

  if (/\bcompar/.test(n)) return { kind: "compare", period, categoryQuery: null }
  if (/maior(?:es)?\s+gasto|onde\s+(?:eu\s+)?gastei\s+mais|categoria\s+que\s+mais|mais\s+gast/.test(n)) return { kind: "top_expenses", period, categoryQuery: null }
  if (/\bsaldo\b|quanto\s+(?:eu\s+)?tenho|patrimonio/.test(n)) return { kind: "balance", period, categoryQuery: null }
  if (/\bresum|como\s+(?:estou|esta|foi)|balanco|situacao/.test(n)) return { kind: "summary", period, categoryQuery: null }
  if (/\bmetas?\b/.test(n)) return { kind: "goals", period, categoryQuery: null }
  if (/orcamento/.test(n)) return { kind: "budgets", period, categoryQuery: null }
  if (/\bajuda\b|o que (?:voce )?(?:faz|pode)|comandos|como (?:te )?uso/.test(n)) return { kind: "help", period, categoryQuery: null }
  return { kind: "unknown", period, categoryQuery: null }
}

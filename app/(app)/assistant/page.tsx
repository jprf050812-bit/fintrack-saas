"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Send, User, Check, X, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cn, formatCurrency } from "@/lib/utils"

interface Proposal {
  type: "income" | "expense"
  amount: number
  description: string
  categoryId: string | null
  categoryName: string | null
  date: string
  dateAssumed: boolean
  status: "pending" | "processing" | "confirmed" | "cancelled"
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  proposal?: Proposal | null
}

interface Category { id: string; name: string; type: string }

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Olá! Sou o FinBot. Respondo com os seus dados reais e posso registrar movimentações, sempre com a sua confirmação.",
}

const SUGGESTIONS = [
  "Resumo do mês",
  "Quanto gastei com mercado?",
  "Maiores gastos",
  "Comparar com o mês passado",
  "Gastei 45 reais no mercado hoje",
]

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [mode, setMode] = useState<"ai" | "basic" | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [cardError, setCardError] = useState<Record<string, string>>({})
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (d.mode) setMode(d.mode)
        if (Array.isArray(d.messages) && d.messages.length > 0) setMessages([WELCOME, ...d.messages])
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const addAssistant = (content: string, extra: Partial<Message> = {}) =>
    setMessages((p) => [...p, { id: `a${Date.now()}${Math.random()}`, role: "assistant", content, ...extra }])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    setMessages((p) => [...p, { id: `u${Date.now()}`, role: "user", content }])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        addAssistant(data.error || "Não consegui responder agora.")
      } else {
        if (data.mode) setMode(data.mode)
        setMessages((p) => [...p, { id: data.messageId, role: "assistant", content: data.response, proposal: data.proposal }])
      }
    } catch {
      addAssistant("Sem conexão. Nada foi registrado. Tente novamente em instantes.")
    } finally {
      setLoading(false)
    }
  }

  const respond = async (m: Message, action: "confirm" | "cancel") => {
    if (!m.proposal) return
    setBusy(m.id)
    setCardError((p) => ({ ...p, [m.id]: "" }))
    try {
      const res = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: m.id,
          action,
          categoryId: action === "confirm" ? (choice[m.id] ?? m.proposal.categoryId ?? "") || null : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCardError((p) => ({ ...p, [m.id]: data.error || "Não foi possível concluir." }))
        return
      }
      setMessages((p) =>
        p.map((x) => (x.id === m.id && x.proposal ? { ...x, proposal: { ...x.proposal, status: action === "confirm" ? "confirmed" : "cancelled" } } : x))
      )
      addAssistant(data.message)
    } catch {
      setCardError((p) => ({ ...p, [m.id]: "Sem conexão. Nada foi registrado." }))
    } finally {
      setBusy(null)
    }
  }

  const renderProposal = (m: Message) => {
    const pr = m.proposal
    if (!pr) return null
    const isExpense = pr.type === "expense"
    const options = categories.filter((c) => c.type === pr.type)
    const selected = choice[m.id] ?? pr.categoryId ?? ""
    return (
      <div className="mt-2 rounded-xl border bg-white dark:bg-gray-800 p-3 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs font-semibold", isExpense ? "text-red-600" : "text-green-600")}>
            {isExpense ? "Despesa" : "Receita"}
          </span>
          <span className="text-lg font-bold">{formatCurrency(pr.amount)}</span>
        </div>
        {pr.description && <p className="text-sm">{pr.description}</p>}
        <p className="text-xs text-muted-foreground">
          {fmtDate(pr.date)}{pr.dateAssumed ? " (data assumida: hoje)" : ""}
        </p>

        {pr.status === "pending" && (
          <>
            <Select
              value={selected}
              onChange={(e) => setChoice((p) => ({ ...p, [m.id]: e.target.value }))}
              className="mt-2 h-11"
              aria-label="Categoria"
            >
              <option value="">Sem categoria</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {cardError[m.id] && <p role="alert" className="mt-2 text-xs text-red-600">{cardError[m.id]}</p>}
            <div className="mt-2 flex gap-2">
              <Button onClick={() => respond(m, "confirm")} disabled={busy === m.id} className="h-11 flex-1">
                {busy === m.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Confirmar
              </Button>
              <Button variant="outline" onClick={() => respond(m, "cancel")} disabled={busy === m.id} className="h-11 flex-1">
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </>
        )}
        {pr.status === "processing" && <p className="mt-2 text-xs text-muted-foreground">Registrando…</p>}
        {pr.status === "confirmed" && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600"><Check className="h-3.5 w-3.5" /> Registrado</p>}
        {pr.status === "cancelled" && <p className="mt-2 text-xs text-muted-foreground">Cancelado, nada foi registrado.</p>}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] md:h-[calc(100vh-6rem)] flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assistente</h1>
        {mode && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              mode === "ai" ? "bg-primary/15 text-primary" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            <Sparkles className="h-3 w-3" /> {mode === "ai" ? "IA ativa" : "Modo básico"}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border bg-white dark:bg-gray-800 p-3">
        {historyLoading && <div className="h-10 w-2/3 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="max-w-[85%]">
              <div
                className={cn(
                  "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700"
                )}
              >
                {m.content}
              </div>
              {renderProposal(m)}
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2" aria-live="polite" aria-label="Processando">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-gray-100 dark:bg-gray-700 px-3 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={loading}
            className="min-h-[44px] shrink-0 rounded-full border bg-white dark:bg-gray-800 px-4 text-sm active:bg-gray-100 dark:active:bg-gray-700"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ex.: gastei 45 reais no mercado"
          maxLength={500}
          enterKeyHint="send"
          className="h-12 flex-1 rounded-xl border bg-white dark:bg-gray-800 px-4 text-base outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          aria-label="Enviar"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50 active:scale-95 transition-transform"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

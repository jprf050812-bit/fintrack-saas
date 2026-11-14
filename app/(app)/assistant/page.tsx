"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Send, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Olá! Sou o FinBot, seu assistente financeiro. Escolha uma sugestão ou escreva sua dúvida.",
}

const SUGGESTIONS = [
  "Como montar um orçamento?",
  "Como começar a investir?",
  "Dicas sobre FIIs",
  "Como definir uma meta?",
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages) && d.messages.length > 0) {
          setMessages([WELCOME, ...d.messages])
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

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
      const data = await res.json()
      setMessages((p) => [
        ...p,
        { id: `a${Date.now()}`, role: "assistant", content: data.response || "Não consegui responder agora." },
      ])
    } catch {
      setMessages((p) => [
        ...p,
        { id: `a${Date.now()}`, role: "assistant", content: "Sem conexão. Tente novamente em instantes." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] md:h-[calc(100vh-6rem)] flex-col">
      <h1 className="mb-3 text-2xl md:text-3xl font-bold tracking-tight">Assistente</h1>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border bg-white dark:bg-gray-800 p-3">
        {historyLoading && <div className="h-10 w-2/3 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700"
              )}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
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
          placeholder="Pergunte sobre finanças..."
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

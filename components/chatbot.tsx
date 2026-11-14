"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot } from "lucide-react"

// Desktop shortcut to the assistant screen (the single place where chat,
// confirmations and history live).
export function Chatbot() {
  const pathname = usePathname()
  if (pathname.startsWith("/assistant")) return null
  return (
    <Link
      href="/assistant"
      aria-label="Abrir o assistente"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      <Bot className="h-6 w-6" />
    </Link>
  )
}

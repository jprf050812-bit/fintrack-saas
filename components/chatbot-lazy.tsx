"use client"

import dynamic from "next/dynamic"

// The chatbot is only needed when opened, so load it after the page is ready.
const Chatbot = dynamic(() => import("@/components/chatbot").then((m) => m.Chatbot), {
  ssr: false,
})

export function ChatbotLazy() {
  return <Chatbot />
}

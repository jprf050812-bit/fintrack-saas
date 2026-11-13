"use client"

import { useState } from "react"
import { Heart, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScopeToggleProps {
  scope: "me" | "couple"
  partnerName: string
}

export function ScopeToggle({ scope, partnerName }: ScopeToggleProps) {
  const [loading, setLoading] = useState(false)

  const change = async (next: "me" | "couple") => {
    if (next === scope || loading) return
    setLoading(true)
    await fetch("/api/couple/scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: next }),
    })
    window.location.reload()
  }

  const base = "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors"

  return (
    <div className="flex items-center gap-3 border-b bg-white dark:bg-gray-800 px-4 md:px-8 py-2">
      <div className="inline-flex rounded-full border p-0.5">
        <button
          onClick={() => change("me")}
          disabled={loading}
          className={cn(base, scope === "me" ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300")}
        >
          <User className="h-4 w-4" /> Só eu
        </button>
        <button
          onClick={() => change("couple")}
          disabled={loading}
          className={cn(base, scope === "couple" ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300")}
        >
          <Heart className="h-4 w-4" /> Casal
        </button>
      </div>
      <p className="text-xs text-muted-foreground hidden sm:block">
        {scope === "couple"
          ? `Mostrando os dados somados de você e ${partnerName}`
          : "Mostrando apenas os seus dados"}
      </p>
    </div>
  )
}

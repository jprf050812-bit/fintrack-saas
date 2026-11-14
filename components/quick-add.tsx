"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Plus, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export const NEW_TRANSACTION_EVENT = "fintrack:new-transaction"

export function QuickAdd() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // The assistant screen has its own message field at the bottom.
  if (pathname.startsWith("/assistant")) return null

  const choose = (type: "expense" | "income") => {
    setOpen(false)
    if (pathname === "/transactions") {
      window.dispatchEvent(new CustomEvent(NEW_TRANSACTION_EVENT, { detail: { type } }))
    } else {
      router.push(`/transactions?new=${type}`)
    }
  }

  return (
    <div className="md:hidden">
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <div
        className="fixed right-4 z-50 flex flex-col items-end gap-3"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
      >
        {open && (
          <>
            <button
              onClick={() => choose("expense")}
              className="flex min-h-[48px] items-center gap-2 rounded-full bg-white dark:bg-gray-800 px-4 text-sm font-medium shadow-lg active:scale-95 transition-transform"
            >
              <ArrowDownCircle className="h-5 w-5 text-red-500" /> Nova despesa
            </button>
            <button
              onClick={() => choose("income")}
              className="flex min-h-[48px] items-center gap-2 rounded-full bg-white dark:bg-gray-800 px-4 text-sm font-medium shadow-lg active:scale-95 transition-transform"
            >
              <ArrowUpCircle className="h-5 w-5 text-green-600" /> Nova receita
            </button>
          </>
        )}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar lançamento rápido" : "Lançamento rápido"}
          aria-expanded={open}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
        >
          <Plus className={cn("h-6 w-6 transition-transform duration-200", open && "rotate-45")} />
        </button>
      </div>
    </div>
  )
}

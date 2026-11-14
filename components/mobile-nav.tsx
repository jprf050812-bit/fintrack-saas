"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Home, ArrowLeftRight, TrendingUp, Bot, User, LogOut } from "lucide-react"

// Pages reached from the Perfil tab (secondary menu) keep that tab highlighted.
const tabs = [
  { href: "/dashboard", label: "Início", icon: Home, match: ["/dashboard"] },
  { href: "/transactions", label: "Finanças", icon: ArrowLeftRight, match: ["/transactions", "/budgets", "/goals"] },
  { href: "/investments", label: "Invest.", icon: TrendingUp, match: ["/investments"] },
  { href: "/assistant", label: "IA", icon: Bot, match: ["/assistant"] },
  { href: "/settings", label: "Perfil", icon: User, match: ["/settings", "/couple", "/reports"] },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <>
      <header className="md:hidden flex h-14 shrink-0 items-center justify-between border-b bg-white dark:bg-gray-800 px-4 pt-[env(safe-area-inset-top)] box-content">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
          <TrendingUp className="h-5 w-5" />
          FinTrack
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sair"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 dark:bg-gray-800/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.match.some((m) => pathname === m || pathname.startsWith(m + "/"))
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:bg-gray-100 dark:active:bg-gray-700",
                  active ? "text-primary" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0 h-0.5 rounded-full bg-primary transition-all duration-200",
                    active ? "w-8 opacity-100" : "w-0 opacity-0"
                  )}
                />
                <Icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

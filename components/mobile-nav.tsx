"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  PiggyBank,
  Target,
  BarChart3,
  Heart,
  Settings,
  LogOut,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/transactions", label: "Gastos", icon: ArrowLeftRight },
  { href: "/investments", label: "Invest.", icon: TrendingUp },
  { href: "/budgets", label: "Orçam.", icon: PiggyBank },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/reports", label: "Relat.", icon: BarChart3 },
  { href: "/couple", label: "Casal", icon: Heart },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <>
      <header className="md:hidden flex h-14 shrink-0 items-center justify-between border-b bg-white dark:bg-gray-800 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
          <TrendingUp className="h-5 w-5" />
          FinTrack
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            aria-label="Configurações"
            className={cn(
              "rounded-lg p-2 text-gray-500 dark:text-gray-400",
              pathname.startsWith("/settings") && "text-primary"
            )}
          >
            <Settings className="h-5 w-5" />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sair"
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-gray-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-7 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

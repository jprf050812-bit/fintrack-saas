"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { KpiCard } from "@/components/kpi-card"
import { TransactionList } from "@/components/transaction-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { usePrivacy } from "@/components/privacy-provider"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  PiggyBank,
  Bell,
  Landmark,
  Coins,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react"

const chartLoading = () => <Skeleton className="h-[220px] w-full" />
const FlowChart = dynamic(() => import("@/components/dashboard-charts").then((m) => m.FlowChart), {
  ssr: false,
  loading: chartLoading,
})
const EvolutionChart = dynamic(() => import("@/components/dashboard-charts").then((m) => m.EvolutionChart), {
  ssr: false,
  loading: chartLoading,
})
const CategoryDonut = dynamic(() => import("@/components/dashboard-charts").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: () => <Skeleton className="h-[180px] w-full" />,
})

interface Alert {
  id: string
  type: string
  title: string
  message: string
}

const alertIcons: Record<string, any> = {
  warning: AlertTriangle,
  success: PiggyBank,
  info: Bell,
}

const RANGES = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "3months", label: "3 meses" },
  { key: "year", label: "Ano" },
  { key: "custom", label: "Personalizado" },
] as const

const typeLabels: Record<string, string> = {
  stock: "Ações",
  fii: "FIIs",
  crypto: "Cripto",
  etf: "ETFs",
  fixed_income: "Renda Fixa",
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}
function isoMonthStart() {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { hidden, toggle } = usePrivacy()

  const [range, setRange] = useState<string>("month")
  const [from, setFrom] = useState(isoMonthStart())
  const [to, setTo] = useState(isoToday())
  const [data, setData] = useState<any>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (range === "custom" && (!from || !to || from > to)) return
    const id = ++requestId.current
    setLoading(true)
    setError("")
    try {
      const qs = new URLSearchParams({ range })
      if (range === "custom") {
        qs.set("from", from)
        qs.set("to", to)
      }
      const res = await fetch(`/api/dashboard?${qs}`)
      if (!res.ok) throw new Error("fail")
      const json = await res.json()
      if (id === requestId.current) setData(json) // ignore out-of-date responses
    } catch {
      if (id === requestId.current) setError("Não foi possível carregar seus dados.")
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [range, from, to])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {})
  }, [])

  const firstName = session?.user?.name?.split(" ")[0]
  const d = data
  const trendOf = (v: number | null | undefined, inverted = false): "up" | "down" | "neutral" => {
    if (typeof v !== "number" || v === 0) return "neutral"
    return (v > 0) !== inverted ? "up" : "down"
  }

  const totalAllocation = d ? d.allocation.reduce((a: number, i: any) => a + i.value, 0) : 0

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            {d?.shared ? " · visão do casal" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            aria-pressed={hidden}
            className="flex h-11 w-11 items-center justify-center rounded-full border bg-white dark:bg-gray-800 active:scale-95 transition-transform"
          >
            {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          <Link href="/transactions?new=expense" className="hidden md:block">
            <Button>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="space-y-3">
        <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto pb-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                range === r.key
                  ? "bg-primary text-white border-primary"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-100"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 rounded-lg border bg-white dark:bg-gray-800 px-3 text-sm"
              aria-label="Data inicial"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 rounded-lg border bg-white dark:bg-gray-800 px-3 text-sm"
              aria-label="Data final"
            />
          </div>
        )}
        {d && <p className="text-xs text-muted-foreground">Período: {d.period.label}</p>}
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar de novo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {!d ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={cn("h-24", i === 4 && "col-span-2 lg:col-span-1")} />
          ))}
        </div>
      ) : (
        <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-5 transition-opacity", loading && "opacity-60")}>
          <KpiCard
            title="Saldo total"
            value={formatCurrency(d.totalBalance)}
            icon={Wallet}
            hint={d.shared ? "Carteiras do casal" : "Soma das suas carteiras"}
          />
          <KpiCard
            title="Patrimônio total"
            value={formatCurrency(d.netWorth)}
            icon={Landmark}
            hint="Saldo + investimentos"
          />
          <KpiCard
            title="Receitas"
            value={formatCurrency(d.income)}
            change={d.changes.income}
            icon={TrendingUp}
            trend={trendOf(d.changes.income)}
          />
          <KpiCard
            title="Despesas"
            value={formatCurrency(d.expense)}
            change={d.changes.expense}
            icon={TrendingDown}
            trend={trendOf(d.changes.expense, true)}
          />
          <div className="col-span-2 lg:col-span-1">
            <KpiCard
              title="Economia"
              value={formatCurrency(d.savings)}
              change={d.changes.savings}
              icon={Coins}
              trend={trendOf(d.changes.savings)}
              hint={d.savingsRate !== null ? `${d.savingsRate}% da receita` : undefined}
            />
          </div>
        </div>
      )}

      {d && !d.hasData && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <PiggyBank className="h-10 w-10 text-primary" />
            <p className="font-medium">Nenhuma movimentação ainda</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Registre sua primeira receita ou despesa para ver os gráficos e comparações.
            </p>
            <Link href="/transactions?new=expense">
              <Button>Registrar movimentação</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      {d && d.hasData && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receitas × Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                {d.series.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">Sem dados no período.</p>
                ) : (
                  <FlowChart data={d.series} hidden={hidden} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução do resultado</CardTitle>
                <p className="text-xs text-muted-foreground">Receitas menos despesas, acumulado no período.</p>
              </CardHeader>
              <CardContent>
                {d.series.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">Sem dados no período.</p>
                ) : (
                  <EvolutionChart data={d.series} hidden={hidden} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Despesas por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {d.categories.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma despesa no período.</p>
                ) : (
                  <div className="grid items-center gap-4 sm:grid-cols-2">
                    <CategoryDonut data={d.categories} />
                    <ul className="space-y-2">
                      {d.categories.map((c: any) => (
                        <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="shrink-0 font-medium">{c.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Metas financeiras</CardTitle>
                <Link href="/goals">
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {d.goals.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma meta ativa. Crie uma em Metas.
                  </p>
                ) : (
                  d.goals.map((g: any) => (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{g.name}</span>
                        <span className="shrink-0 text-muted-foreground">{g.progress}%</span>
                      </div>
                      <Progress value={g.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(g.current)} de {formatCurrency(g.target)}
                        {g.deadline ? ` · até ${formatDate(g.deadline)}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Últimas movimentações + alertas */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas movimentações</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!d ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : d.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
            ) : (
              <TransactionList transactions={d.recent} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum alerta no momento.</p>
            ) : (
              alerts.map((alert) => {
                const Icon = alertIcons[alert.type] || Bell
                return (
                  <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div
                      className={`mt-0.5 rounded-full p-1.5 ${
                        alert.type === "warning"
                          ? "bg-yellow-100 text-yellow-700"
                          : alert.type === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                    <Badge
                      variant={alert.type === "warning" ? "destructive" : alert.type === "success" ? "success" : "default"}
                    >
                      {alert.type === "warning" ? "Atenção" : alert.type === "success" ? "Conquista" : "Info"}
                    </Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alocação de ativos */}
      {d && totalAllocation > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Alocação de ativos</CardTitle>
            <Link href="/investments">
              <Button variant="ghost" size="sm">Investimentos</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.allocation
              .filter((a: any) => a.value > 0)
              .map((a: any) => {
                const pct = (a.value / totalAllocation) * 100
                return (
                  <div key={a.type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{typeLabels[a.type] || a.type}</span>
                      <span className="font-medium">{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

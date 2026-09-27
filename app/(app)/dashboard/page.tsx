"use client"

import Link from "next/link"
import { KpiCard } from "@/components/kpi-card"
import { TransactionList } from "@/components/transaction-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  PiggyBank,
  Bell,
} from "lucide-react"
import { useEffect, useState } from "react"

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

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/transactions").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/reports").then((r) => r.json()),
      fetch("/api/investments").then((r) => r.json()),
    ])
      .then(([dashboardData, txData, alertData, reportData, investmentData]) => {
        setData(dashboardData)
        setTransactions((txData.transactions || []).slice(0, 5))
        setAlerts(alertData.alerts || [])
        setMonthlyData(reportData.monthlyData || [])
        setInvestments(investmentData.investments || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const d = data || {}

  const maxNet = Math.max(1, ...monthlyData.map((m) => Math.abs(m.income - m.expense)))

  const typeLabels: Record<string, string> = {
    stock: "Ações",
    fii: "FIIs",
    crypto: "Cripto",
    etf: "ETFs",
    fixed_income: "Renda Fixa",
  }
  const typeColors: Record<string, string> = {
    stock: "bg-blue-500",
    fii: "bg-green-500",
    crypto: "bg-purple-500",
    etf: "bg-orange-500",
    fixed_income: "bg-gray-400",
  }
  const totalInvested = investments.reduce((acc, i) => acc + i.quantity * i.currentPrice, 0)
  const allocation = Object.keys(typeLabels)
    .map((type) => {
      const value = investments
        .filter((i) => i.type === type)
        .reduce((acc, i) => acc + i.quantity * i.currentPrice, 0)
      return {
        type,
        label: typeLabels[type],
        color: typeColors[type],
        percent: totalInvested > 0 ? (value / totalInvested) * 100 : 0,
      }
    })
    .filter((a) => a.percent > 0)

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/transactions">
          <Button>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Saldo Total"
          value={`R$ ${(d.totalBalance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={5.2}
          icon={Wallet}
          trend="up"
        />
        <KpiCard
          title="Receitas do Mês"
          value={`R$ ${(d.monthlyIncome ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={d.incomeChange ?? 0}
          icon={TrendingUp}
          trend={(d.incomeChange ?? 0) >= 0 ? "up" : "down"}
        />
        <KpiCard
          title="Despesas do Mês"
          value={`R$ ${(d.monthlyExpense ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={d.expenseChange ?? 0}
          icon={TrendingDown}
          trend={(d.expenseChange ?? 0) <= 0 ? "up" : "down"}
        />
        <KpiCard
          title="Investimentos"
          value={`R$ ${(d.investments ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={d.investmentChange ?? 0}
          icon={DollarSign}
          trend={(d.investmentChange ?? 0) >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Evolução mensal (receita - despesa) */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Evolução Mensal (Receita - Despesa)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                Ainda não há dados suficientes. Adicione transações para ver a evolução.
              </p>
            ) : (
              <div className="h-[220px] flex items-end justify-between gap-2">
                {monthlyData.map((m) => {
                  const net = m.income - m.expense
                  const height = (Math.abs(net) / maxNet) * 160
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md transition-all ${net >= 0 ? "bg-primary/80 hover:bg-primary" : "bg-red-400 hover:bg-red-500"}`}
                        style={{ height: `${Math.max(height, 2)}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alocação de Ativos */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Alocação de Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allocation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum investimento cadastrado ainda.
              </p>
            ) : (
              allocation.map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.percent.toFixed(0)}%</span>
                  </div>
                  <Progress value={item.percent} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transações Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transações Recentes</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma transação ainda. Adicione a primeira em "Nova Transação".
              </p>
            ) : (
              <TransactionList transactions={transactions} />
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum alerta no momento.
              </p>
            ) : (
              alerts.map((alert) => {
                const Icon = alertIcons[alert.type] || Bell
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`mt-0.5 rounded-full p-1.5 ${
                      alert.type === "warning" ? "bg-yellow-100 text-yellow-700" :
                      alert.type === "success" ? "bg-green-100 text-green-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                    <Badge variant={alert.type === "warning" ? "destructive" : alert.type === "success" ? "success" : "default"}>
                      {alert.type === "warning" ? "Atenção" : alert.type === "success" ? "Conquista" : "Info"}
                    </Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

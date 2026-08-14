"use client"

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
} from "lucide-react"
import { useEffect, useState } from "react"

const mockTransactions = [
  { id: "1", description: "Salário", amount: 8500, type: "income", category: "Renda", categoryColor: "#22c55e", date: "2026-08-01" },
  { id: "2", description: "Supermercado", amount: 450.32, type: "expense", category: "Alimentação", categoryColor: "#f97316", date: "2026-08-02" },
  { id: "3", description: "Netflix", amount: 39.9, type: "expense", category: "Entretenimento", categoryColor: "#ef4444", date: "2026-08-03" },
  { id: "4", description: "Uber", amount: 28.5, type: "expense", category: "Transporte", categoryColor: "#3b82f6", date: "2026-08-04" },
  { id: "5", description: "Freelance", amount: 1200, type: "income", category: "Renda Extra", categoryColor: "#22c55e", date: "2026-08-05" },
]

const mockAlerts = [
  { id: "1", type: "warning", title: "Orçamento de Alimentação", message: "Você atingiu 85% do orçamento mensal", icon: AlertTriangle },
  { id: "2", type: "success", title: "Meta de Emergência", message: "Você atingiu 50% da meta! Continue assim!", icon: PiggyBank },
  { id: "3", type: "info", title: "Investimento", message: "PETR4 subiu 3.2% hoje", icon: TrendingUp },
]

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({
        totalBalance: 24580.50,
        monthlyIncome: 9700,
        monthlyExpense: 3420.72,
        investments: 15600,
        incomeChange: 12.5,
        expenseChange: -3.2,
        investmentChange: 8.1,
      }))
  }, [])

  const d = data || {}

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Patrimônio Total"
          value={`R$ ${d.totalBalance?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "24.580,50"}`}
          change={5.2}
          icon={Wallet}
          trend="up"
        />
        <KpiCard
          title="Receitas do Mês"
          value={`R$ ${d.monthlyIncome?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "9.700,00"}`}
          change={d.incomeChange || 12.5}
          icon={TrendingUp}
          trend="up"
        />
        <KpiCard
          title="Despesas do Mês"
          value={`R$ ${d.monthlyExpense?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "3.420,72"}`}
          change={d.expenseChange || -3.2}
          icon={TrendingDown}
          trend="down"
        />
        <KpiCard
          title="Investimentos"
          value={`R$ ${d.investments?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "15.600,00"}`}
          change={d.investmentChange || 8.1}
          icon={DollarSign}
          trend="up"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Evolução Patrimonial */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Evolução Patrimonial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-2">
              {[65, 72, 68, 75, 82, 78, 85, 88, 92, 95, 98, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                    style={{ height: `${h * 2.5}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Alocação de Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Ações", value: 35, color: "bg-blue-500" },
              { label: "FIIs", value: 25, color: "bg-green-500" },
              { label: "Cripto", value: 15, color: "bg-purple-500" },
              { label: "Renda Fixa", value: 20, color: "bg-orange-500" },
              { label: "Caixa", value: 5, color: "bg-gray-400" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <Progress value={item.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transações Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transações Recentes</CardTitle>
            <Button variant="ghost" size="sm">Ver todas</Button>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={mockTransactions} />
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas Inteligentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlerts.map((alert) => {
              const Icon = alert.icon
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
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

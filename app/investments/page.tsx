"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Plus, Calculator } from "lucide-react"

const mockInvestments = [
  { id: "1", name: "PETR4", type: "stock", quantity: 100, avgPrice: 28.5, currentPrice: 32.4, ticker: "PETR4" },
  { id: "2", name: "KNRI11", type: "fii", quantity: 50, avgPrice: 120, currentPrice: 118.5, ticker: "KNRI11" },
  { id: "3", name: "Bitcoin", type: "crypto", quantity: 0.05, avgPrice: 320000, currentPrice: 345000, ticker: "BTC" },
  { id: "4", name: "IVVB11", type: "etf", quantity: 20, avgPrice: 280, currentPrice: 295, ticker: "IVVB11" },
  { id: "5", name: "CDB Banco XYZ", type: "fixed_income", quantity: 1, avgPrice: 10000, currentPrice: 10200, ticker: "CDB" },
]

export default function InvestmentsPage() {
  const [compoundOpen, setCompoundOpen] = useState(false)
  const [principal, setPrincipal] = useState(10000)
  const [monthly, setMonthly] = useState(500)
  const [rate, setRate] = useState(12)
  const [years, setYears] = useState(10)

  const totalInvested = mockInvestments.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.avgPrice)), 0)
  const currentValue = mockInvestments.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.currentPrice)), 0)
  const totalReturn = currentValue - totalInvested
  const returnPercent = (totalReturn / totalInvested) * 100

  const compoundResult = principal * Math.pow(1 + rate / 100, years) + monthly * 12 * ((Math.pow(1 + rate / 100, years) - 1) / (rate / 100))

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Valor Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Valor Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(currentValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Retorno Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalReturn >= 0 ? "+" : ""}{formatCurrency(totalReturn)} ({returnPercent.toFixed(2)}%)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Carteira */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Carteira de Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockInvestments.map((inv) => {
              const invested = Number(inv.quantity) * Number(inv.avgPrice)
              const current = Number(inv.quantity) * Number(inv.currentPrice)
              const ret = current - invested
              const retPct = (ret / invested) * 100
              const typeLabels: Record<string, string> = { stock: "Ação", fii: "FII", crypto: "Cripto", etf: "ETF", fixed_income: "Renda Fixa" }
              return (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      inv.type === "stock" ? "bg-blue-500" : inv.type === "fii" ? "bg-green-500" : inv.type === "crypto" ? "bg-purple-500" : inv.type === "etf" ? "bg-orange-500" : "bg-gray-500"
                    }`}>
                      {inv.ticker?.slice(0, 3)}
                    </div>
                    <div>
                      <p className="font-medium">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">{typeLabels[inv.type]} • {inv.quantity} unid.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(current)}</p>
                    <div className={`flex items-center justify-end text-xs ${ret >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {ret >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {ret >= 0 ? "+" : ""}{retPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Simulador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Juros Compostos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Inicial (R$)</label>
              <Input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Aporte Mensal (R$)</label>
              <Input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rentabilidade Anual (%)</label>
              <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Período (anos)</label>
              <Input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} />
            </div>
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Valor Futuro Estimado</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(compoundResult)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

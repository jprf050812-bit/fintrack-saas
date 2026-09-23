"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Plus, Calculator } from "lucide-react"

interface Investment {
  id: string
  name: string
  type: string
  ticker: string | null
  quantity: number
  avgPrice: number
  currentPrice: number
}

const typeLabels: Record<string, string> = {
  stock: "Ação",
  fii: "FII",
  crypto: "Cripto",
  etf: "ETF",
  fixed_income: "Renda Fixa",
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", type: "stock", ticker: "", quantity: "", avgPrice: "", currentPrice: "" })

  const [principal, setPrincipal] = useState(10000)
  const [monthly, setMonthly] = useState(500)
  const [rate, setRate] = useState(12)
  const [years, setYears] = useState(10)

  const loadInvestments = async () => {
    setLoading(true)
    const res = await fetch("/api/investments")
    const data = await res.json()
    setInvestments(data.investments || [])
    setLoading(false)
  }

  useEffect(() => {
    loadInvestments()
  }, [])

  const totalInvested = investments.reduce((acc, i) => acc + i.quantity * i.avgPrice, 0)
  const currentValue = investments.reduce((acc, i) => acc + i.quantity * i.currentPrice, 0)
  const totalReturn = currentValue - totalInvested
  const returnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  const compoundResult = principal * Math.pow(1 + rate / 100, years) + monthly * 12 * ((Math.pow(1 + rate / 100, years) - 1) / (rate / 100))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name || !form.quantity || !form.avgPrice) {
      setError("Preencha nome, quantidade e preço médio")
      return
    }
    setSaving(true)
    const res = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        ticker: form.ticker || undefined,
        quantity: Number(form.quantity),
        avgPrice: Number(form.avgPrice),
        currentPrice: form.currentPrice ? Number(form.currentPrice) : undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || "Erro ao adicionar ativo")
      return
    }
    setModalOpen(false)
    setForm({ name: "", type: "stock", ticker: "", quantity: "", avgPrice: "", currentPrice: "" })
    loadInvestments()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Carteira de Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-6">Carregando...</p>
            ) : investments.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                Nenhum ativo cadastrado ainda. Clique em "Novo Ativo" para começar.
              </p>
            ) : (
              investments.map((inv) => {
                const invested = inv.quantity * inv.avgPrice
                const current = inv.quantity * inv.currentPrice
                const ret = current - invested
                const retPct = invested > 0 ? (ret / invested) * 100 : 0
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                        inv.type === "stock" ? "bg-blue-500" : inv.type === "fii" ? "bg-green-500" : inv.type === "crypto" ? "bg-purple-500" : inv.type === "etf" ? "bg-orange-500" : "bg-gray-500"
                      }`}>
                        {(inv.ticker || inv.name).slice(0, 3).toUpperCase()}
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
              })
            )}
          </CardContent>
        </Card>

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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Ativo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: PETR4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="stock">Ação</option>
                <option value="fii">FII</option>
                <option value="crypto">Cripto</option>
                <option value="etf">ETF</option>
                <option value="fixed_income">Renda Fixa</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ticker</label>
              <Input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade</label>
              <Input type="number" step="0.00000001" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço Médio</label>
              <Input type="number" step="0.01" min="0" value={form.avgPrice} onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço Atual</label>
              <Input type="number" step="0.01" min="0" value={form.currentPrice} onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} placeholder="= preço médio" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar Ativo"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { formatCurrency } from "@/lib/utils"
import { Plus, Target, Calendar, TrendingUp } from "lucide-react"

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", targetAmount: "", currentAmount: "", deadline: "" })

  const loadGoals = async () => {
    setLoading(true)
    const res = await fetch("/api/goals")
    const data = await res.json()
    setGoals(data.goals || [])
    setLoading(false)
  }

  useEffect(() => {
    loadGoals()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name || !form.targetAmount || Number(form.targetAmount) <= 0) {
      setError("Preencha nome e valor alvo válido")
      return
    }
    setSaving(true)
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currentAmount: form.currentAmount ? Number(form.currentAmount) : 0,
        deadline: form.deadline || undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || "Erro ao criar meta")
      return
    }
    setModalOpen(false)
    setForm({ name: "", targetAmount: "", currentAmount: "", deadline: "" })
    loadGoals()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Metas Financeiras</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-10">Carregando...</p>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma meta criada ainda. Clique em "Nova Meta" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const percent = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
            const remaining = g.targetAmount - g.currentAmount

            return (
              <Card key={g.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      {g.name}
                    </CardTitle>
                    <Badge variant={percent >= 100 ? "success" : "default"}>
                      {percent.toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{formatCurrency(g.currentAmount)} de {formatCurrency(g.targetAmount)}</span>
                    </div>
                    <Progress value={Math.min(percent, 100)} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Prazo</p>
                        <p className="font-medium">{g.deadline ? new Date(g.deadline).toLocaleDateString("pt-BR") : "Sem prazo"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Falta</p>
                        <p className="font-medium">{formatCurrency(Math.max(remaining, 0))}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Meta">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Fundo de Emergência" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Alvo (R$)</label>
              <Input type="number" step="0.01" min="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Atual (R$)</label>
              <Input type="number" step="0.01" min="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prazo</label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Criar Meta"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

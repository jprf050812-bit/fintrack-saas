"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { formatCurrency } from "@/lib/utils"
import { Plus, Target, Calendar, TrendingUp, Pencil, Trash2, PiggyBank } from "lucide-react"

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  isMine: boolean
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", targetAmount: "", currentAmount: "", deadline: "" })
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contribute, setContribute] = useState<Goal | null>(null)
  const [contribAmount, setContribAmount] = useState("")
  const [notice, setNotice] = useState("")

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
    try {
      const res = await fetch(editing ? `/api/goals/${editing.id}` : "/api/goals", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? {
                name: form.name,
                targetAmount: Number(form.targetAmount),
                currentAmount: form.currentAmount ? Number(form.currentAmount) : 0,
                deadline: form.deadline || null,
              }
            : {
                name: form.name,
                targetAmount: Number(form.targetAmount),
                currentAmount: form.currentAmount ? Number(form.currentAmount) : 0,
                deadline: form.deadline || undefined,
              }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Erro ao salvar meta")
        return
      }
      setModalOpen(false)
      setNotice(editing ? "Meta atualizada." : "Meta criada.")
      setEditing(null)
      setForm({ name: "", targetAmount: "", currentAmount: "", deadline: "" })
      loadGoals()
    } catch {
      setError("Sem conexão. Nada foi salvo.")
    } finally {
      setSaving(false)
    }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: "", targetAmount: "", currentAmount: "", deadline: "" })
    setError("")
    setModalOpen(true)
  }

  const openEdit = (g: Goal) => {
    setEditing(g)
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      deadline: g.deadline ? g.deadline.slice(0, 10) : "",
    })
    setError("")
    setModalOpen(true)
  }

  const handleDelete = async (g: Goal) => {
    if (!confirm(`Excluir a meta "${g.name}"?`)) return
    const res = await fetch(`/api/goals/${g.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    setNotice(res.ok ? "Meta excluída." : data.error || "Não foi possível excluir.")
    if (res.ok) loadGoals()
  }

  const submitContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(contribAmount)
    if (!contribute || !amount || amount <= 0) {
      setError("Informe um valor maior que zero")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/goals/${contribute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addAmount: amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Erro ao adicionar valor")
        return
      }
      setContribute(null)
      setContribAmount("")
      setNotice("Valor adicionado à meta.")
      loadGoals()
    } catch {
      setError("Sem conexão. Nada foi salvo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Metas Financeiras</h1>
        <Button onClick={openNew} className="h-11">
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>
      )}

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
                    <div className="flex items-center gap-1">
                      <Badge variant={percent >= 100 ? "success" : "default"}>
                        {percent.toFixed(0)}%
                      </Badge>
                      {g.isMine && (
                        <>
                          <button onClick={() => openEdit(g)} aria-label={`Editar ${g.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-700"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(g)} aria-label={`Excluir ${g.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-700"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
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
                  {g.isMine && percent < 100 && (
                    <Button variant="outline" className="h-11 w-full" onClick={() => { setContribute(g); setContribAmount(""); setError("") }}>
                      <PiggyBank className="mr-2 h-4 w-4" /> Adicionar valor
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Meta" : "Nova Meta"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Fundo de Emergência" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Alvo (R$)</label>
              <Input type="number" inputMode="decimal" step="0.01" min="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Atual (R$)</label>
              <Input type="number" inputMode="decimal" step="0.01" min="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prazo</label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar Meta"}
          </Button>
        </form>
      </Modal>

      <Modal open={!!contribute} onClose={() => setContribute(null)} title="Adicionar à meta">
        <form onSubmit={submitContribution} className="space-y-4">
          <p className="text-sm text-muted-foreground">{contribute?.name}</p>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="contrib">Valor (R$)</label>
            <Input id="contrib" type="number" inputMode="decimal" step="0.01" min="0" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} className="h-12 text-lg" autoFocus />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="h-12 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

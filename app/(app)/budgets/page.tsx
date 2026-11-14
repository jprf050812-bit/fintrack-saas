"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { formatCurrency } from "@/lib/utils"
import { Plus, AlertTriangle, Pencil, Trash2 } from "lucide-react"

interface Budget {
  id: string
  name: string
  amount: number
  spent: number
  category: string | null
  categoryId: string | null
  isMine: boolean
}

interface Category {
  id: string
  name: string
  type: string
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", amount: "", categoryId: "" })
  const [editing, setEditing] = useState<Budget | null>(null)
  const [notice, setNotice] = useState("")

  const loadData = async () => {
    setLoading(true)
    const [bRes, cRes] = await Promise.all([fetch("/api/budgets"), fetch("/api/categories")])
    const bData = await bRes.json()
    const cData = await cRes.json()
    setBudgets(bData.budgets || [])
    setCategories((cData.categories || []).filter((c: Category) => c.type === "expense"))
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name || !form.amount || Number(form.amount) <= 0) {
      setError("Preencha nome e valor válido")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/budgets/${editing.id}` : "/api/budgets", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { name: form.name, amount: Number(form.amount), categoryId: form.categoryId || null }
            : { name: form.name, amount: Number(form.amount), categoryId: form.categoryId || undefined }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Erro ao salvar orçamento")
        return
      }
      setModalOpen(false)
      setNotice(editing ? "Orçamento atualizado." : "Orçamento criado.")
      setEditing(null)
      setForm({ name: "", amount: "", categoryId: "" })
      loadData()
    } catch {
      setError("Sem conexão. Nada foi salvo.")
    } finally {
      setSaving(false)
    }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: "", amount: "", categoryId: "" })
    setError("")
    setModalOpen(true)
  }

  const openEdit = (b: Budget) => {
    setEditing(b)
    setForm({ name: b.name, amount: String(b.amount), categoryId: b.categoryId || "" })
    setError("")
    setModalOpen(true)
  }

  const handleDelete = async (b: Budget) => {
    if (!confirm(`Excluir o orçamento "${b.name}"? Suas transações não serão afetadas.`)) return
    const res = await fetch(`/api/budgets/${b.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    setNotice(res.ok ? "Orçamento excluído." : data.error || "Não foi possível excluir.")
    if (res.ok) loadData()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Orçamentos</h1>
        <Button onClick={openNew} className="h-11">
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-center py-10">Carregando...</p>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum orçamento criado ainda. Clique em "Novo Orçamento" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0
            const isOver = percent > 100
            const isWarning = percent > 80 && !isOver

            return (
              <Card key={b.id} className={isOver ? "border-red-300" : isWarning ? "border-yellow-300" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      {isOver && <Badge variant="destructive">Estourado</Badge>}
                      {isWarning && <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Atenção</Badge>}
                      {b.isMine && (
                        <>
                          <button onClick={() => openEdit(b)} aria-label={`Editar ${b.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-700"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(b)} aria-label={`Excluir ${b.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-700"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gasto</span>
                    <span className="font-medium">{formatCurrency(b.spent)} de {formatCurrency(b.amount)}</span>
                  </div>
                  <Progress
                    value={Math.min(percent, 100)}
                    className={`h-2 ${isOver ? "bg-red-100" : isWarning ? "bg-yellow-100" : ""}`}
                  />
                  <div className="flex justify-between text-xs">
                    <span className={isOver ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {percent.toFixed(0)}% utilizado
                    </span>
                    <span className="text-muted-foreground">
                      {isOver ? `-${formatCurrency(b.spent - b.amount)}` : `${formatCurrency(b.amount - b.spent)} restante`}
                    </span>
                  </div>
                  {!b.category && (
                    <p className="text-[11px] text-muted-foreground">
                      Sem categoria vinculada — o gasto não é calculado automaticamente.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Orçamento" : "Novo Orçamento"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Alimentação" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor Mensal (R$)</label>
            <Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria vinculada</label>
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Nenhuma</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">Vincular uma categoria permite calcular o gasto automaticamente a partir das transações.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar Orçamento"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Download, Search, Plus, Filter, Trash2, Loader2 } from "lucide-react"

interface Transaction {
  id: string
  description: string | null
  amount: number
  type: string
  category: string
  categoryColor: string
  date: string
  status: string
}

interface Category {
  id: string
  name: string
  type: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "expense",
    categoryId: "",
    date: new Date().toISOString().slice(0, 10),
  })

  const loadData = async () => {
    setLoading(true)
    const [txRes, catRes] = await Promise.all([
      fetch("/api/transactions"),
      fetch("/api/categories"),
    ])
    const txData = await txRes.json()
    const catData = await catRes.json()
    setTransactions(txData.transactions || [])
    setCategories(catData.categories || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = transactions.filter((t) => {
    const desc = (t.description || "").toLowerCase()
    const matchesSearch = desc.includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === "all" || t.type === filter
    return matchesSearch && matchesFilter
  })

  const exportCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Status"]
    const rows = filtered.map((t) => [formatDate(t.date), t.description || "", t.category, t.type, t.amount.toString(), t.status])
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "transacoes.csv"
    link.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Informe um valor válido")
      return
    }
    setSaving(true)
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description || undefined,
        amount: Number(form.amount),
        type: form.type,
        categoryId: form.categoryId || undefined,
        date: form.date,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || "Erro ao salvar transação")
      return
    }

    setModalOpen(false)
    setForm({ description: "", amount: "", type: "expense", categoryId: "", date: new Date().toISOString().slice(0, 10) })
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta transação?")) return
    await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-[140px]">
                <option value="all">Todas</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">
              Nenhuma transação encontrada. Clique em "Nova" para adicionar a primeira.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Descrição</th>
                    <th className="pb-3 font-medium">Categoria</th>
                    <th className="pb-3 font-medium">Tipo</th>
                    <th className="pb-3 font-medium text-right">Valor</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-3">{formatDate(t.date)}</td>
                      <td className="py-3 font-medium">{t.description || "-"}</td>
                      <td className="py-3">
                        <Badge variant="outline">{t.category}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={t.type === "income" ? "success" : "destructive"}>
                          {t.type === "income" ? "Receita" : "Despesa"}
                        </Badge>
                      </td>
                      <td className={`py-3 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-3">
                        <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                          {t.status === "completed" ? "Concluído" : "Pendente"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Transação">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Supermercado"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Sem categoria</option>
                {categories
                  .filter((c) => c.type === form.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Transação"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

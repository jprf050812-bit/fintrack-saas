"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Download, Search, Plus, Filter } from "lucide-react"

const mockData = [
  { id: "1", description: "Salário", amount: 8500, type: "income", category: "Renda", date: "2026-08-01", status: "completed" },
  { id: "2", description: "Supermercado Extra", amount: 450.32, type: "expense", category: "Alimentação", date: "2026-08-02", status: "completed" },
  { id: "3", description: "Netflix", amount: 39.9, type: "expense", category: "Entretenimento", date: "2026-08-03", status: "completed" },
  { id: "4", description: "Uber", amount: 28.5, type: "expense", category: "Transporte", date: "2026-08-04", status: "completed" },
  { id: "5", description: "Freelance Design", amount: 1200, type: "income", category: "Renda Extra", date: "2026-08-05", status: "completed" },
  { id: "6", description: "Academia", amount: 120, type: "expense", category: "Saúde", date: "2026-08-06", status: "pending" },
  { id: "7", description: "Aluguel", amount: 1800, type: "expense", category: "Moradia", date: "2026-08-01", status: "completed" },
  { id: "8", description: "Dividendos PETR4", amount: 340, type: "income", category: "Investimentos", date: "2026-08-07", status: "completed" },
]

export default function TransactionsPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const filtered = mockData.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === "all" || t.type === filter
    return matchesSearch && matchesFilter
  })

  const exportCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Status"]
    const rows = filtered.map((t) => [t.date, t.description, t.category, t.type, t.amount.toString(), t.status])
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "transacoes.csv"
    link.click()
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
          <Button>
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
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="py-3">{formatDate(t.date)}</td>
                    <td className="py-3 font-medium">{t.description}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

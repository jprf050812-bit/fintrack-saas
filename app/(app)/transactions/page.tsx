"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  Download,
  Search,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Repeat,
  Landmark,
  Tag,
  X,
} from "lucide-react"

interface Tx {
  id: string
  description: string | null
  amount: number
  type: string
  status: string
  date: string
  categoryId: string | null
  category: string
  categoryColor: string
  walletId: string | null
  wallet: string | null
  paymentMethod: string | null
  notes: string | null
  installmentGroupId: string | null
  installmentNumber: number | null
  installmentTotal: number | null
  transferGroupId: string | null
  recurring: boolean
  isMine: boolean
  owner: string | null
}
interface Category { id: string; name: string; type: string; color: string; isDefault: boolean }
interface Wallet { id: string; name: string; type: string; balance: number; isMine: boolean }
interface Rule { id: string; type: string; amount: number; description: string | null; category: string; frequency: string; nextDate: string; endDate: string | null }

const PAYMENT: Record<string, string> = {
  pix: "Pix", debit: "Débito", credit: "Crédito", cash: "Dinheiro", boleto: "Boleto", transfer: "Transferência", other: "Outro",
}
const FREQ: Record<string, string> = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" }
const WALLET_TYPES: Record<string, string> = {
  checking: "Conta corrente", savings: "Poupança", cash: "Dinheiro", credit_card: "Cartão de crédito", investment: "Investimento",
}
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

const pad = (n: number) => String(n).padStart(2, "0")
const localIso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const emptyForm = (type = "expense") => ({
  type, amount: "", description: "", categoryId: "", walletId: "", date: localIso(),
  paymentMethod: "", notes: "", mode: "single" as "single" | "installments" | "recurring",
  installments: "2", frequency: "monthly", endDate: "",
})

const isTransfer = (t: Tx) => t.type === "transfer_in" || t.type === "transfer_out"

function csvCell(v: string) {
  let s = v ?? ""
  if (/^[=+\-@]/.test(s)) s = "'" + s // avoid spreadsheet formula injection
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function TransactionsPage() {
  const now = new Date()
  const [mode, setMode] = useState<"month" | "all" | "custom">("month")
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [customFrom, setCustomFrom] = useState(localIso(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [customTo, setCustomTo] = useState(localIso())
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [catFilter, setCatFilter] = useState("")
  const [methodFilter, setMethodFilter] = useState("")

  const [txs, setTxs] = useState<Tx[]>([])
  const [totals, setTotals] = useState({ income: 0, expense: 0, count: 0 })
  const [hasMore, setHasMore] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState("")
  const [notice, setNotice] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tx | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<Tx | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const [transferOpen, setTransferOpen] = useState(false)
  const [transfer, setTransfer] = useState({ fromWalletId: "", toWalletId: "", amount: "", date: localIso(), description: "" })
  const [walletOpen, setWalletOpen] = useState(false)
  const [walletForm, setWalletForm] = useState({ name: "", type: "checking", balance: "" })
  const [catOpen, setCatOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", type: "expense", color: "#3b82f6" })
  const [modalError, setModalError] = useState("")
  const [modalBusy, setModalBusy] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  const reqId = useRef(0)
  const myWallets = wallets.filter((w) => w.isMine)

  const range = useCallback(() => {
    if (mode === "all") return { from: "", to: "" }
    if (mode === "custom") return { from: customFrom, to: customTo }
    const last = new Date(ym.y, ym.m + 1, 0).getDate()
    return { from: `${ym.y}-${pad(ym.m + 1)}-01`, to: `${ym.y}-${pad(ym.m + 1)}-${pad(last)}` }
  }, [mode, ym, customFrom, customTo])

  const buildQs = useCallback(
    (offset: number) => {
      const { from, to } = range()
      const p = new URLSearchParams({ limit: "100", offset: String(offset) })
      if (from) p.set("from", from)
      if (to) p.set("to", to)
      if (q) p.set("q", q)
      if (typeFilter !== "all") p.set("type", typeFilter)
      if (catFilter) p.set("categoryId", catFilter)
      if (methodFilter) p.set("paymentMethod", methodFilter)
      return p.toString()
    },
    [range, q, typeFilter, catFilter, methodFilter]
  )

  const loadTx = useCallback(async () => {
    if (mode === "custom" && (!customFrom || !customTo || customFrom > customTo)) return
    const id = ++reqId.current
    setLoading(true)
    setListError("")
    try {
      const res = await fetch(`/api/transactions?${buildQs(0)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (id !== reqId.current) return
      setTxs(data.transactions)
      setTotals(data.totals)
      setHasMore(data.hasMore)
    } catch {
      if (id === reqId.current) setListError("Não foi possível carregar as movimentações.")
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [buildQs, mode, customFrom, customTo])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/transactions?${buildQs(txs.length)}`)
      const data = await res.json()
      if (res.ok) {
        setTxs((p) => [...p, ...data.transactions])
        setHasMore(data.hasMore)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const loadMeta = useCallback(async () => {
    const [c, w, r] = await Promise.all([
      fetch("/api/categories").then((x) => x.json()).catch(() => ({})),
      fetch("/api/wallets").then((x) => x.json()).catch(() => ({})),
      fetch("/api/recurring").then((x) => x.json()).catch(() => ({})),
    ])
    setCategories(c.categories || [])
    setWallets(w.wallets || [])
    setRules(r.rules || [])
  }, [])

  useEffect(() => { loadMeta() }, [loadMeta])
  useEffect(() => { loadTx() }, [loadTx])
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(""), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const refreshAll = () => { loadTx(); loadMeta() }

  const openNew = useCallback((type = "expense") => {
    setEditing(null)
    setForm({ ...emptyForm(type) })
    setFormError("")
    setFormOpen(true)
  }, [])

  // Quick-add button (mobile) and home-screen shortcuts (?new=expense|income)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("new")
    if (param === "expense" || param === "income") {
      openNew(param)
      window.history.replaceState(null, "", "/transactions")
    }
    const onEvent = (e: Event) => openNew((e as CustomEvent).detail?.type === "income" ? "income" : "expense")
    window.addEventListener("fintrack:new-transaction", onEvent)
    return () => window.removeEventListener("fintrack:new-transaction", onEvent)
  }, [openNew])

  const openEdit = (t: Tx) => {
    setEditing(t)
    setForm({
      ...emptyForm(t.type),
      amount: String(t.amount),
      description: t.description || "",
      categoryId: t.categoryId || "",
      walletId: t.walletId || "",
      date: t.date.slice(0, 10),
      paymentMethod: t.paymentMethod || "",
      notes: t.notes || "",
    })
    setFormError("")
    setFormOpen(true)
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    const amount = Number(form.amount)
    if (!amount || amount <= 0) return setFormError("Informe um valor maior que zero")
    if (!form.date) return setFormError("Informe a data")

    const body: any = {
      description: form.description || undefined,
      amount,
      type: form.type,
      categoryId: form.categoryId || null,
      walletId: form.walletId || null,
      date: form.date,
      paymentMethod: form.paymentMethod || null,
      notes: form.notes || null,
    }
    if (!editing) {
      if (form.mode === "installments") {
        const n = Number(form.installments)
        if (!Number.isInteger(n) || n < 2 || n > 60) return setFormError("Parcelas: informe de 2 a 60")
        body.installments = n
      }
      if (form.mode === "recurring") {
        if (form.endDate && form.endDate < form.date) return setFormError("A data final deve ser depois da data inicial")
        body.recurring = { frequency: form.frequency, endDate: form.endDate || null }
      }
    }

    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/transactions/${editing.id}` : "/api/transactions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setFormError(data.error || "Erro ao salvar")
      setFormOpen(false)
      setNotice(editing ? "Movimentação atualizada." : data.created > 1 ? `${data.created} parcelas registradas.` : "Movimentação registrada.")
      refreshAll()
    } catch {
      setFormError("Sem conexão. Nada foi salvo, tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (scope: "one" | "group") => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      const res = await fetch(`/api/transactions/${deleting.id}${scope === "group" ? "?scope=group" : ""}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setNotice(data.error || "Não foi possível excluir."); return }
      setDeleting(null)
      setNotice("Movimentação excluída.")
      refreshAll()
    } catch {
      setNotice("Sem conexão. Nada foi excluído.")
    } finally {
      setDeletingBusy(false)
    }
  }

  const call = async (url: string, method: string, body?: any) => {
    setModalBusy(true)
    setModalError("")
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setModalError(data.error || "Erro ao salvar"); return false }
      return true
    } catch {
      setModalError("Sem conexão. Tente novamente.")
      return false
    } finally {
      setModalBusy(false)
    }
  }

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(transfer.amount)
    if (!transfer.fromWalletId || !transfer.toWalletId) return setModalError("Escolha as duas contas")
    if (!amount || amount <= 0) return setModalError("Informe um valor maior que zero")
    if (await call("/api/transfers", "POST", { ...transfer, amount, description: transfer.description || undefined })) {
      setTransferOpen(false)
      setNotice("Transferência registrada.")
      refreshAll()
    }
  }

  const submitWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletForm.name.trim()) return setModalError("Informe o nome da conta")
    if (await call("/api/wallets", "POST", { name: walletForm.name, type: walletForm.type, balance: Number(walletForm.balance) || 0 })) {
      setWalletOpen(false)
      setNotice("Conta criada.")
      loadMeta()
    }
  }

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catForm.name.trim()) return setModalError("Informe o nome da categoria")
    if (await call("/api/categories", "POST", catForm)) {
      setCatForm({ name: "", type: catForm.type, color: catForm.color })
      loadMeta()
    }
  }

  const removeCategory = async (id: string) => {
    if (!confirm("Excluir esta categoria? As movimentações dela ficarão como \"Sem categoria\".")) return
    if (await call(`/api/categories/${id}`, "DELETE")) { refreshAll() }
  }

  const endRule = async (id: string) => {
    if (!confirm("Encerrar esta recorrência? O que já foi lançado continua no histórico.")) return
    if (await call(`/api/recurring/${id}`, "DELETE")) { setNotice("Recorrência encerrada."); loadMeta() }
  }

  const exportCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Conta", "Pagamento", "Status", "Observações"]
    const typeLabel = (t: string) => (t === "income" ? "Receita" : t === "expense" ? "Despesa" : "Transferência")
    const rows = txs.map((t) => [
      formatDate(t.date), t.description || "", t.category, typeLabel(t.type), t.amount.toFixed(2).replace(".", ","),
      t.wallet || "", t.paymentMethod ? PAYMENT[t.paymentMethod] : "", t.status === "pending" ? "Agendada" : "Concluída", t.notes || "",
    ])
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
    link.download = "movimentacoes.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const shiftMonth = (delta: number) => setYm((p) => {
    const d = new Date(p.y, p.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const formCategories = categories.filter((c) => c.type === form.type)
  const perInstallment = form.mode === "installments" && Number(form.amount) > 0 && Number(form.installments) >= 2
    ? Number(form.amount) / Number(form.installments) : null
  const label = "text-sm font-medium"
  const field = "h-11"

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Finanças</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setTransfer({ fromWalletId: myWallets[0]?.id || "", toWalletId: myWallets[1]?.id || "", amount: "", date: localIso(), description: "" }); setModalError(""); setTransferOpen(true) }} className="h-11">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
          </Button>
          <Button variant="outline" onClick={() => { setModalError(""); setCatOpen(true) }} className="h-11">
            <Tag className="mr-2 h-4 w-4" /> Categorias
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={txs.length === 0} className="h-11">
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={() => openNew()} className="hidden md:inline-flex h-11">
            <Plus className="mr-2 h-4 w-4" /> Nova
          </Button>
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>
      )}

      {/* Contas */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-3 overflow-x-auto pb-1">
        {wallets.map((w) => (
          <div key={w.id} className="min-w-[170px] shrink-0 rounded-xl border bg-white dark:bg-gray-800 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Landmark className="h-3.5 w-3.5 shrink-0" /> {w.name}{!w.isMine ? " (parceiro)" : ""}
            </p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(w.balance)}</p>
            <p className="text-[11px] text-muted-foreground">{WALLET_TYPES[w.type] || w.type}</p>
          </div>
        ))}
        <button
          onClick={() => { setWalletForm({ name: "", type: "checking", balance: "" }); setModalError(""); setWalletOpen(true) }}
          className="flex min-w-[130px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground active:bg-gray-100 dark:active:bg-gray-700"
        >
          <Plus className="h-4 w-4" /> Nova conta
        </button>
      </div>

      {/* Período e filtros */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border p-0.5 text-sm">
              {([["month", "Mês"], ["custom", "Período"], ["all", "Tudo"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k}
                  className={cn("min-h-[40px] rounded-md px-3", mode === k ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300")}>
                  {l}
                </button>
              ))}
            </div>
            {mode === "month" && (
              <div className="flex items-center gap-1">
                <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className="flex h-11 w-11 items-center justify-center rounded-lg border active:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
                <span className="min-w-[150px] text-center text-sm font-medium">{MONTHS[ym.m]} de {ym.y}</span>
                <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" className="flex h-11 w-11 items-center justify-center rounded-lg border active:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
              </div>
            )}
            {mode === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className={cn(field, "w-auto")} aria-label="Data inicial" />
                <span className="text-sm text-muted-foreground">até</span>
                <Input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className={cn(field, "w-auto")} aria-label="Data final" />
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className={cn(field, "pl-9")} />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={field} aria-label="Tipo">
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
              <option value="transfer">Transferências</option>
            </Select>
            <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={field} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={field} aria-label="Forma de pagamento">
              <option value="">Qualquer pagamento</option>
              {Object.entries(PAYMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-3">
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="truncate text-sm sm:text-lg font-bold text-green-600">{formatCurrency(totals.income)}</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-3">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="truncate text-sm sm:text-lg font-bold text-red-600">{formatCurrency(totals.expense)}</p>
        </div>
        <div className="rounded-xl border bg-white dark:bg-gray-800 p-3">
          <p className="text-xs text-muted-foreground">Resultado</p>
          <p className={cn("truncate text-sm sm:text-lg font-bold", totals.income - totals.expense >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(totals.income - totals.expense)}
          </p>
        </div>
      </div>

      {/* Recorrências */}
      {rules.length > 0 && (
        <Card>
          <CardHeader className="p-4">
            <button onClick={() => setRulesOpen(!rulesOpen)} className="flex min-h-[44px] w-full items-center justify-between text-left" aria-expanded={rulesOpen}>
              <CardTitle className="flex items-center gap-2 text-base"><Repeat className="h-4 w-4" /> Recorrências ativas ({rules.length})</CardTitle>
              <ChevronRight className={cn("h-4 w-4 transition-transform", rulesOpen && "rotate-90")} />
            </button>
          </CardHeader>
          {rulesOpen && (
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.description || r.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {FREQ[r.frequency]} · {formatCurrency(r.amount)} · próxima em {formatDate(r.nextDate)}
                      {r.endDate ? ` · até ${formatDate(r.endDate)}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => endRule(r.id)} className="min-h-[44px] shrink-0">Encerrar</Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {listError && (
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-red-600">{listError}</p>
              <Button size="sm" variant="outline" onClick={loadTx}>Tentar de novo</Button>
            </div>
          )}
          {loading && txs.length === 0 ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !listError && txs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="font-medium">Nenhuma movimentação encontrada</p>
              <p className="max-w-xs text-sm text-muted-foreground">Ajuste os filtros ou registre uma nova movimentação.</p>
              <Button onClick={() => openNew()}><Plus className="mr-2 h-4 w-4" /> Registrar</Button>
            </div>
          ) : (
            <ul className={cn("divide-y transition-opacity", loading && "opacity-60")}>
              {txs.map((t) => {
                const transfer = isTransfer(t)
                const plus = t.type === "income" || t.type === "transfer_in"
                return (
                  <li key={t.id} className="flex items-center gap-3 p-3 sm:p-4">
                    <span className="h-10 w-10 shrink-0 rounded-full" style={{ backgroundColor: t.categoryColor + "26" }}>
                      <span className="flex h-full items-center justify-center">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.categoryColor }} />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.description || t.category}
                        {t.owner && <span className="ml-2 text-xs font-normal text-muted-foreground">({t.isMine ? "você" : t.owner})</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(t.date)} · {t.category}
                        {t.paymentMethod ? ` · ${PAYMENT[t.paymentMethod]}` : ""}
                        {t.wallet ? ` · ${t.wallet}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.status === "pending" && <Badge variant="secondary">Agendada</Badge>}
                        {t.installmentTotal && <Badge variant="secondary">Parcela {t.installmentNumber}/{t.installmentTotal}</Badge>}
                        {t.recurring && <Badge variant="secondary">Recorrente</Badge>}
                      </div>
                      {t.notes && <p className="mt-1 truncate text-xs italic text-muted-foreground">{t.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <p className={cn("text-sm font-semibold", transfer ? "text-indigo-600" : plus ? "text-green-600" : "text-red-600")}>
                        {plus ? "+" : "-"}{formatCurrency(t.amount)}
                      </p>
                      {t.isMine && (
                        <div className="flex">
                          {!transfer && (
                            <button onClick={() => openEdit(t)} aria-label="Editar" className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-700">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setDeleting(t)} aria-label="Excluir" className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:active:bg-gray-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {hasMore && (
            <div className="border-t p-3 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="h-11">
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Carregar mais
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nova / editar movimentação */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar movimentação" : "Nova movimentação"}>
        <form onSubmit={submitForm} className="space-y-4">
          {formError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>}

          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button type="button" key={t} onClick={() => setForm({ ...form, type: t, categoryId: "" })} aria-pressed={form.type === t}
                className={cn("min-h-[44px] rounded-lg border text-sm font-medium",
                  form.type === t ? (t === "expense" ? "border-red-500 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700") : "text-gray-600")}>
                {t === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className={label} htmlFor="f-amount">{form.mode === "installments" ? "Valor total (R$)" : "Valor (R$)"}</label>
            <Input id="f-amount" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-12 text-lg" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className={label} htmlFor="f-desc">Descrição</label>
            <Input id="f-desc" maxLength={200} placeholder="Ex: Mercado" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={label} htmlFor="f-cat">Categoria</label>
              <Select id="f-cat" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={field}>
                <option value="">Sem categoria</option>
                {formCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="f-date">{form.mode === "single" ? "Data" : "Primeira data"}</label>
              <Input id="f-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="f-wallet">Conta</label>
              <Select id="f-wallet" value={form.walletId} onChange={(e) => setForm({ ...form, walletId: e.target.value })} className={field}>
                <option value="">Conta principal</option>
                {myWallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="f-pay">Forma de pagamento</label>
              <Select id="f-pay" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={field}>
                <option value="">Não informada</option>
                {Object.entries(PAYMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label} htmlFor="f-notes">Observações (opcional)</label>
            <textarea id="f-notes" maxLength={500} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          {!editing && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className={label}>Repetição</p>
              <div className="grid grid-cols-3 gap-2">
                {([["single", "Única"], ["installments", "Parcelada"], ["recurring", "Recorrente"]] as const).map(([k, l]) => (
                  <button type="button" key={k} onClick={() => setForm({ ...form, mode: k })} aria-pressed={form.mode === k}
                    className={cn("min-h-[44px] rounded-lg border text-sm", form.mode === k ? "border-primary bg-primary/10 text-primary font-medium" : "text-gray-600")}>
                    {l}
                  </button>
                ))}
              </div>
              {form.mode === "installments" && (
                <div className="space-y-1.5">
                  <label className={label} htmlFor="f-inst">Número de parcelas (2 a 60)</label>
                  <Input id="f-inst" type="number" inputMode="numeric" min="2" max="60" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} className={field} />
                  {perInstallment !== null && (
                    <p className="text-xs text-muted-foreground">≈ {formatCurrency(perInstallment)} por mês, uma parcela em cada mês a partir da data escolhida.</p>
                  )}
                </div>
              )}
              {form.mode === "recurring" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className={label} htmlFor="f-freq">Frequência</label>
                    <Select id="f-freq" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={field}>
                      {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={label} htmlFor="f-end">Termina em (opcional)</label>
                    <Input id="f-end" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={field} />
                  </div>
                </div>
              )}
            </div>
          )}
          {editing?.installmentTotal && <p className="text-xs text-muted-foreground">Você está editando apenas esta parcela.</p>}
          {form.date > localIso() && <p className="text-xs text-muted-foreground">Data futura: ficará como agendada e só altera o saldo no dia.</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="h-12 flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="h-12 flex-1">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmar exclusão */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Excluir movimentação?">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{deleting.description || deleting.category}</strong> · {formatCurrency(deleting.amount)} · {formatDate(deleting.date)}
            </p>
            <p className="text-sm text-muted-foreground">
              {deleting.transferGroupId
                ? "A transferência será desfeita nas duas contas."
                : "O saldo da conta será ajustado. Esta ação não pode ser desfeita."}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => confirmDelete("one")} disabled={deletingBusy} className="h-12 bg-red-600 hover:bg-red-700">
                {deletingBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleting.installmentTotal ? "Excluir só esta parcela" : "Excluir"}
              </Button>
              {deleting.installmentTotal && (
                <Button onClick={() => confirmDelete("group")} disabled={deletingBusy} variant="outline" className="h-12 border-red-300 text-red-700">
                  Excluir todas as {deleting.installmentTotal} parcelas
                </Button>
              )}
              <Button variant="outline" onClick={() => setDeleting(null)} className="h-12">Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transferência */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir entre contas">
        <form onSubmit={submitTransfer} className="space-y-4">
          {modalError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</div>}
          {myWallets.length < 2 ? (
            <p className="text-sm text-muted-foreground">Você precisa de pelo menos duas contas. Crie outra em &quot;Nova conta&quot;.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className={label} htmlFor="t-from">De</label>
                <Select id="t-from" value={transfer.fromWalletId} onChange={(e) => setTransfer({ ...transfer, fromWalletId: e.target.value })} className={field}>
                  {myWallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className={label} htmlFor="t-to">Para</label>
                <Select id="t-to" value={transfer.toWalletId} onChange={(e) => setTransfer({ ...transfer, toWalletId: e.target.value })} className={field}>
                  {myWallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={label} htmlFor="t-amount">Valor (R$)</label>
                  <Input id="t-amount" type="number" inputMode="decimal" step="0.01" min="0" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} className="h-12 text-lg" />
                </div>
                <div className="space-y-1.5">
                  <label className={label} htmlFor="t-date">Data</label>
                  <Input id="t-date" type="date" value={transfer.date} onChange={(e) => setTransfer({ ...transfer, date: e.target.value })} className="h-12" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={label} htmlFor="t-desc">Descrição (opcional)</label>
                <Input id="t-desc" maxLength={200} value={transfer.description} onChange={(e) => setTransfer({ ...transfer, description: e.target.value })} className={field} />
              </div>
              <p className="text-xs text-muted-foreground">Transferências não contam como receita nem despesa nos relatórios.</p>
            </>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setTransferOpen(false)} className="h-12 flex-1">Cancelar</Button>
            <Button type="submit" disabled={modalBusy || myWallets.length < 2} className="h-12 flex-1">
              {modalBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Transferir
            </Button>
          </div>
        </form>
      </Modal>

      {/* Nova conta */}
      <Modal open={walletOpen} onClose={() => setWalletOpen(false)} title="Nova conta">
        <form onSubmit={submitWallet} className="space-y-4">
          {modalError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</div>}
          <div className="space-y-1.5">
            <label className={label} htmlFor="w-name">Nome</label>
            <Input id="w-name" maxLength={50} placeholder="Ex: Nubank" value={walletForm.name} onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })} className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="w-type">Tipo</label>
            <Select id="w-type" value={walletForm.type} onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value })} className={field}>
              {Object.entries(WALLET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="w-bal">Saldo inicial (R$)</label>
            <Input id="w-bal" type="number" inputMode="decimal" step="0.01" value={walletForm.balance} onChange={(e) => setWalletForm({ ...walletForm, balance: e.target.value })} className={field} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setWalletOpen(false)} className="h-12 flex-1">Cancelar</Button>
            <Button type="submit" disabled={modalBusy} className="h-12 flex-1">Criar conta</Button>
          </div>
        </form>
      </Modal>

      {/* Categorias */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Categorias">
        <div className="space-y-4">
          {modalError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</div>}
          <form onSubmit={submitCategory} className="space-y-3 rounded-lg border p-3">
            <p className={label}>Nova categoria</p>
            <Input maxLength={40} placeholder="Nome" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className={field} aria-label="Nome da categoria" />
            <div className="flex gap-2">
              <Select value={catForm.type} onChange={(e) => setCatForm({ ...catForm, type: e.target.value })} className={field} aria-label="Tipo">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </Select>
              <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="h-11 w-14 shrink-0 rounded-md border p-1" aria-label="Cor" />
            </div>
            <Button type="submit" disabled={modalBusy} className="h-11 w-full">Adicionar</Button>
          </form>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {categories.filter((c) => !c.isDefault).length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">Você ainda não criou categorias próprias.</p>
            )}
            {categories.filter((c) => !c.isDefault).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-2 pl-3">
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name} <span className="text-xs text-muted-foreground">({c.type === "income" ? "receita" : "despesa"})</span>
                </span>
                <button onClick={() => removeCategory(c.id)} aria-label={`Excluir ${c.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => setCatOpen(false)} className="h-12 w-full">Fechar</Button>
        </div>
      </Modal>
    </div>
  )
}

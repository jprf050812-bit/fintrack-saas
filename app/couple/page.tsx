"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Heart, UserPlus, Users, Wallet, ArrowRightLeft } from "lucide-react"
import { useState } from "react"

const mockSharedWallets = [
  { id: "1", name: "Conta Conjunta", balance: 8500, members: ["Você", "Parceiro(a)"], type: "checking" },
  { id: "2", name: "Fundo Viagem", balance: 4200, members: ["Você", "Parceiro(a)"], type: "savings" },
]

const mockCoupleTransactions = [
  { id: "1", description: "Supermercado", amount: 650, paidBy: "Você", date: "2026-08-10", category: "Alimentação" },
  { id: "2", description: "Conta de Luz", amount: 280, paidBy: "Parceiro(a)", date: "2026-08-08", category: "Moradia" },
  { id: "3", description: "Jantar", amount: 180, paidBy: "Você", date: "2026-08-05", category: "Lazer" },
]

export default function CouplePage() {
  const [inviteEmail, setInviteEmail] = useState("")

  const handleInvite = async () => {
    if (!inviteEmail) return
    await fetch("/api/couple/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    })
    setInviteEmail("")
    alert("Convite enviado!")
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          Modo Casal
        </h1>
      </div>

      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold border-2 border-white">U</div>
              <div className="h-10 w-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold border-2 border-white">P</div>
            </div>
            <div>
              <p className="font-medium">Você e Parceiro(a)</p>
              <p className="text-sm text-muted-foreground">Vinculados desde 15/01/2026</p>
            </div>
          </div>
          <Badge variant="success" className="bg-green-100 text-green-700">Ativo</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Carteiras Compartilhadas
            </CardTitle>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Nova</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockSharedWallets.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{w.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Users className="h-3 w-3" />
                    {w.members.join(", ")}
                  </div>
                </div>
                <p className="text-lg font-bold">{formatCurrency(w.balance)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Últimas Transações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockCoupleTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{t.description}</p>
                  <p className="text-xs text-muted-foreground">Pago por {t.paidBy} • {t.category}</p>
                </div>
                <p className="font-semibold text-red-600">-{formatCurrency(t.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convidar Parceiro(a)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Email do parceiro(a)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleInvite}>
            <Heart className="mr-2 h-4 w-4" />
            Convidar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

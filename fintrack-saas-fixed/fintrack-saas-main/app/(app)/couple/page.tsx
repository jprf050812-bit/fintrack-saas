"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Heart, UserPlus, Mail } from "lucide-react"

interface Invite {
  id: string
  inviteeEmail: string
  status: string
  createdAt: string
}

interface Relation {
  id: string
  status: string
  user1: { name: string | null; email: string }
  user2: { name: string | null; email: string }
}

export default function CouplePage() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [invites, setInvites] = useState<Invite[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const res = await fetch("/api/couple/invite")
    const data = await res.json()
    setInvites(data.sent || [])
    setRelations(data.relations || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail) return
    setSending(true)
    setMessage("")
    const res = await fetch("/api/couple/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) {
      setMessage(data.error || "Erro ao enviar convite")
      return
    }
    setMessage(data.message)
    setInviteEmail("")
    loadData()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          Modo Casal
        </h1>
      </div>

      {relations.length > 0 ? (
        relations.map((r) => (
          <Card key={r.id} className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold border-2 border-white">
                    {(r.user1.name || r.user1.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold border-2 border-white">
                    {(r.user2.name || r.user2.email).charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="font-medium">{r.user1.name || r.user1.email} e {r.user2.name || r.user2.email}</p>
                </div>
              </div>
              <Badge variant="success" className="bg-green-100 text-green-700">Ativo</Badge>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Você ainda não está vinculado(a) a nenhum parceiro(a). Envie um convite abaixo.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Convidar Parceiro(a)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Email do parceiro(a)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleInvite} disabled={sending}>
              <UserPlus className="mr-2 h-4 w-4" />
              {sending ? "Enviando..." : "Convidar"}
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convites Enviados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-4">Carregando...</p>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum convite enviado ainda.</p>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                <p className="text-sm font-medium">{inv.inviteeEmail}</p>
                <Badge variant={inv.status === "pending" ? "secondary" : "success"}>
                  {inv.status === "pending" ? "Pendente" : inv.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

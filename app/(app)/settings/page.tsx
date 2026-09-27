"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Shield } from "lucide-react"

export default function SettingsPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState("")

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        setName(data.user?.name || "")
        setEmail(data.user?.email || "")
      })
      .finally(() => setLoading(false))
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg("")
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setSavingProfile(false)
    setProfileMsg(res.ok ? "Alterações salvas!" : data.error || "Erro ao salvar")
  }

  const changePassword = async () => {
    setSavingPassword(true)
    setPasswordMsg("")
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json()
    setSavingPassword(false)
    if (res.ok) {
      setPasswordMsg("Senha alterada com sucesso!")
      setCurrentPassword("")
      setNewPassword("")
    } else {
      setPasswordMsg(data.error || "Erro ao alterar senha")
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} type="email" disabled />
              </div>
            </div>
            {profileMsg && <p className="text-sm text-muted-foreground">{profileMsg}</p>}
            <Button onClick={saveProfile} disabled={savingProfile || loading}>
              {savingProfile ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              As preferências de notificação ainda não são configuráveis — em breve.
            </p>
            {[
              { label: "Alertas de orçamento", desc: "Notificar quando atingir 80% do limite" },
              { label: "Metas atingidas", desc: "Celebrar quando atingir uma meta" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha Atual</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            {passwordMsg && <p className="text-sm text-muted-foreground">{passwordMsg}</p>}
            <Button
              variant="outline"
              onClick={changePassword}
              disabled={savingPassword || !currentPassword || newPassword.length < 6}
            >
              {savingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

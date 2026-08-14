"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Shield, CreditCard, Globe } from "lucide-react"

export default function SettingsPage() {
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
                <Input defaultValue="Usuário FinTrack" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input defaultValue="usuario@email.com" type="email" />
              </div>
            </div>
            <Button>Salvar Alterações</Button>
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
            {[
              { label: "Alertas de orçamento", desc: "Notificar quando atingir 80% do limite", enabled: true },
              { label: "Vencimento de contas", desc: "Lembrar 3 dias antes do vencimento", enabled: true },
              { label: "Atualizações de investimentos", desc: "Notificar variações significativas", enabled: false },
              { label: "Metas atingidas", desc: "Celebrar quando atingir uma meta", enabled: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Badge variant={item.enabled ? "success" : "secondary"}>
                  {item.enabled ? "Ativo" : "Desativado"}
                </Badge>
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
              <Input type="password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input type="password" />
            </div>
            <Button variant="outline">Alterar Senha</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, Target, Calendar, TrendingUp } from "lucide-react"

const mockGoals = [
  { id: "1", name: "Fundo de Emergência", targetAmount: 30000, currentAmount: 15000, deadline: "2026-12-31", monthlyContribution: 2500 },
  { id: "2", name: "Viagem Japão", targetAmount: 25000, currentAmount: 8750, deadline: "2027-03-15", monthlyContribution: 1500 },
  { id: "3", name: "Entrada Apartamento", targetAmount: 150000, currentAmount: 45000, deadline: "2028-06-01", monthlyContribution: 3500 },
  { id: "4", name: "Novo Notebook", targetAmount: 8000, currentAmount: 6400, deadline: "2026-09-30", monthlyContribution: 800 },
]

export default function GoalsPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Metas Financeiras</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mockGoals.map((g) => {
          const percent = (g.currentAmount / g.targetAmount) * 100
          const remaining = g.targetAmount - g.currentAmount
          const monthsLeft = Math.ceil(remaining / g.monthlyContribution)

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
                  <Progress value={percent} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Prazo</p>
                      <p className="font-medium">{new Date(g.deadline).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Aporte Mensal</p>
                      <p className="font-medium">{formatCurrency(g.monthlyContribution)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Tempo estimado para atingir a meta</p>
                  <p className="font-bold text-primary">{monthsLeft} {monthsLeft === 1 ? "mês" : "meses"}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

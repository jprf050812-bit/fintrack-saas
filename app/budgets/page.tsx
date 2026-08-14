"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, AlertTriangle } from "lucide-react"

const mockBudgets = [
  { id: "1", name: "Alimentação", amount: 1200, spent: 1020, category: "Alimentação", color: "bg-orange-500" },
  { id: "2", name: "Transporte", amount: 600, spent: 340, category: "Transporte", color: "bg-blue-500" },
  { id: "3", name: "Entretenimento", amount: 400, spent: 420, category: "Entretenimento", color: "bg-red-500" },
  { id: "4", name: "Saúde", amount: 500, spent: 120, category: "Saúde", color: "bg-green-500" },
  { id: "5", name: "Moradia", amount: 2500, spent: 2500, category: "Moradia", color: "bg-purple-500" },
  { id: "6", name: "Educação", amount: 800, spent: 200, category: "Educação", color: "bg-yellow-500" },
]

export default function BudgetsPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockBudgets.map((b) => {
          const percent = (b.spent / b.amount) * 100
          const isOver = percent > 100
          const isWarning = percent > 80 && !isOver

          return (
            <Card key={b.id} className={isOver ? "border-red-300" : isWarning ? "border-yellow-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  {isOver && <Badge variant="destructive">Estourado</Badge>}
                  {isWarning && <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Atenção</Badge>}
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
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

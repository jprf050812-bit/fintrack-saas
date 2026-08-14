"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react"

const monthlyData = [
  { month: "Jan", income: 8000, expense: 3200 },
  { month: "Fev", income: 8200, expense: 3500 },
  { month: "Mar", income: 8500, expense: 3100 },
  { month: "Abr", income: 8300, expense: 3800 },
  { month: "Mai", income: 9000, expense: 3400 },
  { month: "Jun", income: 8800, expense: 3600 },
  { month: "Jul", income: 9200, expense: 3300 },
  { month: "Ago", income: 9700, expense: 3420 },
]

const heatmapData = [
  { day: "Seg", values: [120, 80, 200, 50, 300, 150, 90] },
  { day: "Ter", values: [90, 150, 80, 200, 100, 250, 180] },
  { day: "Qua", values: [200, 100, 150, 300, 80, 120, 200] },
  { day: "Qui", values: [150, 200, 100, 80, 250, 90, 150] },
  { day: "Sex", values: [300, 250, 400, 150, 200, 350, 280] },
  { day: "Sáb", values: [400, 350, 500, 200, 450, 300, 380] },
  { day: "Dom", values: [100, 80, 150, 50, 120, 90, 100] },
]

const insights = [
  "Suas despesas com entretenimento aumentaram 25% em relação ao mês anterior. Considere revisar assinaturas.",
  "Você está economizando em média 62% da sua renda. Excelente performance!",
  "Seus investimentos em FIIs representam 40% da carteira. Diversificação adequada para renda passiva.",
  "Gastos com transporte estão 15% abaixo da média dos últimos 3 meses. Continue assim!",
]

export default function ReportsPage() {
  const maxIncome = Math.max(...monthlyData.map((d) => d.income))
  const maxExpense = Math.max(...monthlyData.map((d) => d.expense))

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>

      {/* Comparativo Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensal (Receitas vs Despesas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-end justify-between gap-2">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 justify-center" style={{ height: "250px", alignItems: "flex-end" }}>
                  <div
                    className="w-3 bg-green-500 rounded-t"
                    style={{ height: `${(d.income / maxIncome) * 200}px` }}
                    title={`Receita: ${formatCurrency(d.income)}`}
                  />
                  <div
                    className="w-3 bg-red-500 rounded-t"
                    style={{ height: `${(d.expense / maxExpense) * 200}px` }}
                    title={`Despesa: ${formatCurrency(d.expense)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-red-500" />
              <span>Despesas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mapa de Calor */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-8 gap-1">
                <div className="text-xs text-muted-foreground" />
                {["S1", "S2", "S3", "S4", "S5", "S6", "S7"].map((s) => (
                  <div key={s} className="text-[10px] text-center text-muted-foreground">{s}</div>
                ))}
              </div>
              {heatmapData.map((row) => (
                <div key={row.day} className="grid grid-cols-8 gap-1 items-center">
                  <div className="text-xs text-muted-foreground">{row.day}</div>
                  {row.values.map((v, i) => {
                    const intensity = Math.min(1, v / 500)
                    return (
                      <div
                        key={i}
                        className="aspect-square rounded"
                        style={{ backgroundColor: `rgba(239, 68, 68, ${intensity})` }}
                        title={`R$ ${v}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Insights Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3 rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="mt-0.5 rounded-full bg-yellow-100 p-1.5 h-fit">
                  <Lightbulb className="h-4 w-4 text-yellow-700" />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

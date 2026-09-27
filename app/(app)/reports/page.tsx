"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Lightbulb } from "lucide-react"

interface MonthlyDatum {
  month: string
  income: number
  expense: number
}

interface HeatmapDatum {
  day: string
  total: number
}

export default function ReportsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyDatum[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapDatum[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => {
        setMonthlyData(data.monthlyData || [])
        setHeatmap(data.heatmap || [])
        setInsights(data.insights || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const maxIncome = Math.max(1, ...monthlyData.map((d) => d.income))
  const maxExpense = Math.max(1, ...monthlyData.map((d) => d.expense))
  const maxHeat = Math.max(1, ...heatmap.map((h) => h.total))

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensal (Receitas vs Despesas)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-16">Carregando...</p>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Dia da Semana (últimas 8 semanas)</CardTitle>
          </CardHeader>
          <CardContent>
            {heatmap.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Sem dados suficientes ainda.</p>
            ) : (
              <div className="space-y-2">
                {heatmap.map((row) => {
                  const intensity = Math.min(1, row.total / maxHeat)
                  return (
                    <div key={row.day} className="flex items-center gap-3">
                      <div className="w-10 text-xs text-muted-foreground">{row.day}</div>
                      <div
                        className="flex-1 h-6 rounded"
                        style={{ backgroundColor: `rgba(239, 68, 68, ${intensity})` }}
                        title={formatCurrency(row.total)}
                      />
                      <div className="w-24 text-right text-xs text-muted-foreground">{formatCurrency(row.total)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

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

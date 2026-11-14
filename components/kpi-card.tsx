"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  // number = percent change, null = nothing to compare against, undefined = hide
  change?: number | null
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  changeLabel?: string
  hint?: string
}

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  trend = "neutral",
  changeLabel = "vs período anterior",
  hint,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4 sm:p-6 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="text-lg sm:text-2xl font-bold truncate">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        {change === null && (
          <p className="text-xs mt-1 text-gray-500">Sem base de comparação</p>
        )}
        {typeof change === "number" && (
          <div
            className={cn(
              "flex items-center text-xs mt-1",
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
            )}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3 mr-1 shrink-0" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-3 w-3 mr-1 shrink-0" />
            ) : null}
            <span className="truncate">
              {change > 0 ? "+" : ""}
              {change}% {changeLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

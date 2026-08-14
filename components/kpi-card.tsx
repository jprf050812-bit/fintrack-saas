"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  change?: number
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
}

export function KpiCard({ title, value, change, icon: Icon, trend = "neutral" }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center text-xs mt-1",
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
          )}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : trend === "down" ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
            {change > 0 ? "+" : ""}{change}% vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  )
}

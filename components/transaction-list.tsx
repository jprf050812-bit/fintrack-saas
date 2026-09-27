"use client"

import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

interface Transaction {
  id: string
  description: string
  amount: number
  type: string
  category: string
  categoryColor: string
  date: string
}

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: t.categoryColor }}
            >
              {t.category.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm">{t.description || t.category}</p>
              <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "font-semibold text-sm",
              t.type === "income" ? "text-green-600" : "text-red-600"
            )}>
              {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
            </p>
            <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}


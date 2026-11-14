"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 })
const GREEN = "#16a34a"
const RED = "#dc2626"
const BLUE = "#2563eb"

interface SeriesPoint {
  label: string
  income: number
  expense: number
  net: number
  cumulative: number
}

const tooltipStyle = { borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }

export function FlowChart({ data, hidden }: { data: SeriesPoint[]; hidden: boolean }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => (hidden ? "" : compact.format(v))}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => [formatCurrency(v), name === "income" ? "Receitas" : "Despesas"]}
          />
          <Bar dataKey="income" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EvolutionChart({ data, hidden }: { data: SeriesPoint[]; hidden: boolean }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => (hidden ? "" : compact.format(v))}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Resultado acumulado"]} />
          <Area type="monotone" dataKey="cumulative" stroke={BLUE} strokeWidth={2} fill="url(#evoFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CategoryPoint {
  name: string
  color: string
  value: number
}

export function CategoryDonut({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
            {data.map((c) => (
              <Cell key={c.name} fill={c.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

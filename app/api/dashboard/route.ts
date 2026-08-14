import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    totalBalance: 24580.50,
    monthlyIncome: 9700,
    monthlyExpense: 3420.72,
    investments: 15600,
    incomeChange: 12.5,
    expenseChange: -3.2,
    investmentChange: 8.1,
  })
}

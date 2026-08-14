import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ transactions: [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ success: true, transaction: body })
}

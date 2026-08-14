import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  return NextResponse.json({ success: true, message: `Convite enviado para ${email}` })
}

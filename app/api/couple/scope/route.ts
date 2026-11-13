import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPartner, SCOPE_COOKIE } from "@/lib/scope"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { scope } = await req.json()
  const wantsCouple = scope === "couple"

  if (wantsCouple && !(await getPartner(session.user.id))) {
    return NextResponse.json({ error: "Você ainda não tem parceiro(a) ativo(a)" }, { status: 400 })
  }

  const res = NextResponse.json({ success: true, scope: wantsCouple ? "couple" : "me" })
  res.cookies.set(SCOPE_COOKIE, wantsCouple ? "couple" : "me", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}

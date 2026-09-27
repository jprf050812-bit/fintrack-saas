import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Email inválido" },
      { status: 400 }
    )
  }

  const inviteeEmail = parsed.data.email.toLowerCase().trim()

  if (inviteeEmail === session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "Você não pode convidar a si mesmo" }, { status: 400 })
  }

  const invitee = await prisma.user.findUnique({ where: { email: inviteeEmail } })

  const invite = await prisma.coupleInvite.create({
    data: {
      inviterId: session.user.id,
      inviteeEmail,
      inviteeId: invitee?.id || null,
      status: "pending",
    },
  })

  return NextResponse.json({
    success: true,
    message: invitee
      ? `Convite enviado para ${inviteeEmail}`
      : `Convite registrado para ${inviteeEmail}. A pessoa poderá aceitar assim que criar uma conta.`,
    invite,
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const userEmail = session.user.email?.toLowerCase()

  const [sent, received, relations] = await Promise.all([
    prisma.coupleInvite.findMany({
      where: { inviterId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    userEmail
      ? prisma.coupleInvite.findMany({
          where: { inviteeEmail: userEmail, status: "pending" },
          include: { inviter: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.coupleRelation.findMany({
      where: {
        OR: [{ user1Id: session.user.id }, { user2Id: session.user.id }],
        status: "active",
      },
      include: { user1: true, user2: true },
    }),
  ])

  return NextResponse.json({ sent, received, relations })
}

const respondSchema = z.object({
  id: z.string(),
  action: z.enum(["accept", "decline"]),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = respondSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 }
    )
  }

  const { id, action } = parsed.data
  const userEmail = session.user.email?.toLowerCase()

  const invite = await prisma.coupleInvite.findUnique({ where: { id } })

  if (!invite || invite.status !== "pending" || invite.inviteeEmail !== userEmail) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
  }

  if (action === "decline") {
    await prisma.coupleInvite.update({ where: { id }, data: { status: "declined" } })
    return NextResponse.json({ success: true, message: "Convite recusado" })
  }

  // Accept: link the invite to this user, mark it accepted, and create the relation.
  const [, relation] = await prisma.$transaction([
    prisma.coupleInvite.update({
      where: { id },
      data: { status: "accepted", inviteeId: session.user.id },
    }),
    prisma.coupleRelation.create({
      data: {
        user1Id: invite.inviterId,
        user2Id: session.user.id,
        status: "active",
      },
    }),
  ])

  return NextResponse.json({ success: true, message: "Convite aceito! Vocês agora estão em Modo Casal.", relation })
}

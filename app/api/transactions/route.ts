import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { randomUUID } from "crypto"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScope } from "@/lib/scope"
import {
  PAYMENT_METHODS,
  FREQUENCIES,
  addMonthsClamped,
  addPeriod,
  brToday,
  parseDateOnly,
  resolveWallet,
  serializeTransaction,
  signedAmount,
  statusForDate,
  syncDue,
  validCategory,
} from "@/lib/finance"

const createSchema = z.object({
  description: z.string().trim().max(200).optional(),
  amount: z.number().positive("Informe um valor maior que zero").max(999_999_999),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().optional().nullable(),
  walletId: z.string().optional().nullable(),
  date: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  installments: z.number().int().min(1).max(60).optional(),
  recurring: z
    .object({
      frequency: z.enum(FREQUENCIES),
      endDate: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { ids, shared } = await getScope(session.user.id)
  await syncDue(ids)

  const sp = req.nextUrl.searchParams
  const from = parseDateOnly(sp.get("from"))
  const to = parseDateOnly(sp.get("to"))
  const type = sp.get("type")
  const categoryId = sp.get("categoryId")
  const method = sp.get("paymentMethod")
  const q = (sp.get("q") || "").trim().slice(0, 80)
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 300, 1), 500)
  const offset = Math.max(Number(sp.get("offset")) || 0, 0)

  const where: any = { userId: { in: ids } }
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = from
    if (to) where.date.lt = new Date(+to + 86_400_000)
  }
  if (type === "income" || type === "expense") where.type = type
  else if (type === "transfer") where.type = { in: ["transfer_in", "transfer_out"] }
  if (categoryId) where.categoryId = categoryId
  if (method) where.paymentMethod = method
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ]
  }

  const [rows, groups] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        user: { select: { name: true } },
        wallet: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      skip: offset,
    }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true }, _count: true }),
  ])

  const sum = (t: string) => Number(groups.find((g) => g.type === t)?._sum.amount || 0)
  const count = groups.reduce((a, g) => a + g._count, 0)
  const hasMore = rows.length > limit

  return NextResponse.json({
    transactions: rows.slice(0, limit).map((t) => serializeTransaction(t, session.user.id, shared)),
    totals: { income: sum("income"), expense: sum("expense"), count },
    hasMore,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 })
  }
  const d = parsed.data

  let date = brToday()
  if (d.date) {
    const p = parseDateOnly(d.date)
    if (!p) return NextResponse.json({ error: "Data inválida" }, { status: 400 })
    date = p
  }
  if (!(await validCategory(userId, d.categoryId))) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
  }
  const installments = d.installments ?? 1
  if (installments > 1 && d.recurring) {
    return NextResponse.json({ error: "Escolha parcelamento ou recorrência, não os dois" }, { status: 400 })
  }
  let endDate: Date | null = null
  if (d.recurring?.endDate) {
    endDate = parseDateOnly(d.recurring.endDate)
    if (!endDate || +endDate < +date) {
      return NextResponse.json({ error: "A data final da recorrência é inválida" }, { status: 400 })
    }
  }

  const wallet = await resolveWallet(userId, d.walletId)
  const base = {
    userId,
    type: d.type,
    categoryId: d.categoryId || null,
    walletId: wallet.id,
    paymentMethod: d.paymentMethod || null,
    notes: d.notes || null,
  }

  // Installments: split the total in cents so the parts always add up exactly.
  if (installments > 1) {
    const totalCents = Math.round(d.amount * 100)
    const baseCents = Math.floor(totalCents / installments)
    const extra = totalCents - baseCents * installments
    const groupId = randomUUID()
    const label = d.description || "Parcelado"
    const rows = Array.from({ length: installments }, (_, i) => {
      const when = addMonthsClamped(date, i, date.getUTCDate())
      return {
        ...base,
        amount: (baseCents + (i < extra ? 1 : 0)) / 100,
        description: `${label} (${i + 1}/${installments})`,
        date: when,
        status: statusForDate(when),
        installmentGroupId: groupId,
        installmentNumber: i + 1,
        installmentTotal: installments,
      }
    })
    const settledDelta = rows
      .filter((r) => r.status === "completed")
      .reduce((a, r) => a + signedAmount(d.type, r.amount), 0)

    await prisma.$transaction([
      prisma.transaction.createMany({ data: rows }),
      ...(settledDelta !== 0
        ? [prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: settledDelta } } })]
        : []),
    ])
    return NextResponse.json({ success: true, created: installments }, { status: 201 })
  }

  const status = statusForDate(date)

  await prisma.$transaction(async (db) => {
    let ruleId: string | null = null
    if (d.recurring) {
      const rule = await db.recurringRule.create({
        data: {
          userId,
          type: d.type,
          amount: d.amount,
          description: d.description || null,
          categoryId: d.categoryId || null,
          walletId: wallet.id,
          paymentMethod: d.paymentMethod || null,
          notes: d.notes || null,
          frequency: d.recurring.frequency,
          nextDate: addPeriod(date, d.recurring.frequency),
          endDate,
        },
      })
      ruleId = rule.id
    }
    await db.transaction.create({
      data: {
        ...base,
        amount: d.amount,
        description: d.description || null,
        date,
        status,
        isRecurring: !!d.recurring,
        recurringFreq: d.recurring?.frequency || null,
        recurringRuleId: ruleId,
      },
    })
    if (status === "completed") {
      await db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: signedAmount(d.type, d.amount) } },
      })
    }
  })

  // A recurring rule that starts in the past generates its missed occurrences now.
  if (d.recurring) await syncDue([userId])

  return NextResponse.json({ success: true, created: 1 }, { status: 201 })
}

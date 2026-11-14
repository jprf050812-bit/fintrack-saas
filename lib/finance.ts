import { prisma } from "@/lib/prisma"

export const PAYMENT_METHODS = ["pix", "debit", "credit", "cash", "boleto", "transfer", "other"] as const
export const FREQUENCIES = ["weekly", "monthly", "yearly"] as const
export type Frequency = (typeof FREQUENCIES)[number]

const DAY = 86_400_000
const BR_OFFSET = 3 * 3_600_000

// Brazilian calendar day as a UTC-midnight Date (how transaction dates are stored).
export function brToday(): Date {
  const d = new Date(Date.now() - BR_OFFSET)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
export function brTomorrow(): Date {
  return new Date(+brToday() + DAY)
}

export function parseDateOnly(s?: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const t = Date.parse(`${s}T00:00:00Z`)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  // Date.parse rolls impossible dates over (2026-02-30 -> 2026-03-02); reject them.
  return d.toISOString().slice(0, 10) === s ? d : null
}

export function addMonthsClamped(d: Date, n: number, day = d.getUTCDate()): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + n
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(day, last)))
}

export function addPeriod(d: Date, freq: string): Date {
  if (freq === "weekly") return new Date(+d + 7 * DAY)
  if (freq === "yearly") return addMonthsClamped(d, 12)
  return addMonthsClamped(d, 1)
}

// Effect of a transaction on its wallet balance.
export function signedAmount(type: string, amount: number): number {
  return type === "income" || type === "transfer_in" ? amount : -amount
}

// A transaction dated in the future is "pending" and does not touch balances
// until its day arrives (see syncDue).
export function statusForDate(date: Date): "completed" | "pending" {
  return +date >= +brTomorrow() ? "pending" : "completed"
}

export async function resolveWallet(userId: string, walletId?: string | null) {
  let wallet = walletId ? await prisma.wallet.findFirst({ where: { id: walletId, userId } }) : null
  if (!wallet) {
    wallet = await prisma.wallet.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
  }
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { name: "Carteira Principal", type: "checking", balance: 0, userId },
    })
  }
  return wallet
}

export async function validCategory(userId: string, categoryId?: string | null) {
  if (!categoryId) return true
  const c = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ isDefault: true }, { userId }] },
    select: { id: true },
  })
  return !!c
}

/**
 * Brings the books up to date for the given users:
 *  1. generates due occurrences of active recurring rules;
 *  2. settles pending (future-dated) transactions whose day has arrived.
 * Each step "claims" its row first so concurrent requests cannot apply it twice.
 */
export async function syncDue(userIds: string[]) {
  const limit = brTomorrow()

  const rules = await prisma.recurringRule.findMany({
    where: { userId: { in: userIds }, active: true, nextDate: { lt: limit } },
  })

  for (const r of rules) {
    const dates: Date[] = []
    let next = r.nextDate
    while (+next < +limit && dates.length < 60 && (!r.endDate || +next <= +r.endDate)) {
      dates.push(next)
      next = addPeriod(next, r.frequency)
    }
    const finished = !!r.endDate && +next > +r.endDate

    await prisma.$transaction(async (db) => {
      const claim = await db.recurringRule.updateMany({
        where: { id: r.id, nextDate: r.nextDate, active: true },
        data: { nextDate: next, active: !finished },
      })
      if (claim.count === 0) return // another request already handled it

      const walletOk = r.walletId
        ? !!(await db.wallet.findFirst({ where: { id: r.walletId, userId: r.userId }, select: { id: true } }))
        : false
      const walletId = walletOk ? r.walletId : null

      for (const date of dates) {
        await db.transaction.create({
          data: {
            userId: r.userId,
            type: r.type,
            amount: r.amount,
            description: r.description,
            categoryId: r.categoryId,
            walletId,
            paymentMethod: r.paymentMethod,
            notes: r.notes,
            date,
            status: "completed",
            isRecurring: true,
            recurringFreq: r.frequency,
            recurringRuleId: r.id,
          },
        })
        if (walletId) {
          await db.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: signedAmount(r.type, Number(r.amount)) } },
          })
        }
      }
    })
  }

  const pending = await prisma.transaction.findMany({
    where: { userId: { in: userIds }, status: "pending", date: { lt: limit } },
    select: { id: true, type: true, amount: true, walletId: true },
    take: 200,
  })

  for (const t of pending) {
    await prisma.$transaction(async (db) => {
      const claim = await db.transaction.updateMany({
        where: { id: t.id, status: "pending" },
        data: { status: "completed" },
      })
      if (claim.count === 0 || !t.walletId) return
      await db.wallet
        .update({
          where: { id: t.walletId },
          data: { balance: { increment: signedAmount(t.type, Number(t.amount)) } },
        })
        .catch(() => {})
    })
  }
}

export function serializeTransaction(t: any, myId: string, shared: boolean) {
  const isTransfer = t.type === "transfer_in" || t.type === "transfer_out"
  return {
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    status: t.status,
    date: t.date,
    categoryId: t.categoryId,
    category: isTransfer ? "Transferência" : t.category?.name || "Sem categoria",
    categoryColor: isTransfer ? "#6366f1" : t.category?.color || "#6b7280",
    walletId: t.walletId,
    wallet: t.wallet?.name || null,
    paymentMethod: t.paymentMethod,
    notes: t.notes,
    installmentGroupId: t.installmentGroupId,
    installmentNumber: t.installmentNumber,
    installmentTotal: t.installmentTotal,
    transferGroupId: t.transferGroupId,
    recurring: !!t.recurringRuleId,
    isMine: t.userId === myId,
    owner: shared ? t.user?.name || "Parceiro(a)" : null,
  }
}

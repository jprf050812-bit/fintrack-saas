import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export const SCOPE_COOKIE = "fintrack_scope"

export async function getPartner(userId: string) {
  const rel = await prisma.coupleRelation.findFirst({
    where: { status: "active", OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, email: true } },
      user2: { select: { id: true, name: true, email: true } },
    },
  })
  if (!rel) return null
  return rel.user1Id === userId ? rel.user2 : rel.user1
}

// Returns the user ids whose data should be shown: just the user, or the
// user + partner when the "Casal" view is on and an active relation exists.
export async function getScope(userId: string) {
  const wantsCouple = cookies().get(SCOPE_COOKIE)?.value === "couple"
  if (!wantsCouple) return { ids: [userId], shared: false, partner: null }
  const partner = await getPartner(userId)
  if (!partner) return { ids: [userId], shared: false, partner: null }
  return { ids: [userId, partner.id], shared: true, partner }
}

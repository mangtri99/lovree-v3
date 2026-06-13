import { eq, count } from 'drizzle-orm'
import { useDb } from '../../db'
import { invitations, guests, rsvps } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()

  const invRows = await db.select({ status: invitations.status }).from(invitations).where(eq(invitations.ownerId, ownerId))
  const total = invRows.length
  const published = invRows.filter((r) => r.status === 'published').length
  const drafts = invRows.filter((r) => r.status === 'draft').length

  const [g] = await db.select({ value: count() }).from(guests)
    .innerJoin(invitations, eq(guests.invitationId, invitations.id))
    .where(eq(invitations.ownerId, ownerId))
  const [r] = await db.select({ value: count() }).from(rsvps)
    .innerJoin(invitations, eq(rsvps.invitationId, invitations.id))
    .where(eq(invitations.ownerId, ownerId))

  return {
    invitations: total,
    published,
    drafts,
    guests: Number(g?.value ?? 0),
    rsvps: Number(r?.value ?? 0),
  }
})

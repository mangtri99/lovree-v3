import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, rsvps } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { summarizeRsvps } from '../../../../../utils/rsvp'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const rows = await db.select({ id: rsvps.id, name: rsvps.name, attendance: rsvps.attendance, message: rsvps.message, guestId: rsvps.guestId, createdAt: rsvps.createdAt })
    .from(rsvps).where(eq(rsvps.invitationId, id)).orderBy(desc(rsvps.createdAt))
  return { rsvps: rows, summary: summarizeRsvps(rows) }
})

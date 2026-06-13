import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, rsvps } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { rowBelongsToInvitation } from '../../../../../utils/belongs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const rsvpId = getRouterParam(event, 'rsvpId')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const [row] = await db.select({ invitationId: rsvps.invitationId }).from(rsvps).where(eq(rsvps.id, rsvpId)).limit(1)
  if (!rowBelongsToInvitation(row ?? null, id)) throw createError({ statusCode: 404, message: 'Not found' })

  await db.delete(rsvps).where(eq(rsvps.id, rsvpId))
  return { ok: true }
})

import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, sessions, guests } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { rowBelongsToInvitation } from '../../../../../utils/belongs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const sessionId = getRouterParam(event, 'sessionId')!
  const userSession = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, userSession.user?.id ?? null)

  const [row] = await db.select({ invitationId: sessions.invitationId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (!rowBelongsToInvitation(row ?? null, id)) throw createError({ statusCode: 404, message: 'Not found' })

  await db.update(guests).set({ sessionId: null }).where(eq(guests.sessionId, sessionId))
  await db.delete(sessions).where(eq(sessions.id, sessionId))
  return { ok: true }
})

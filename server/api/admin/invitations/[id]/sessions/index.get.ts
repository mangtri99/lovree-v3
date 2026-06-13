import { eq, asc } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, sessions } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const rows = await db.select({ id: sessions.id, targetEvent: sessions.targetEvent, timeStart: sessions.timeStart, timeEnd: sessions.timeEnd })
    .from(sessions).where(eq(sessions.invitationId, id)).orderBy(asc(sessions.createdAt))
  return { sessions: rows }
})

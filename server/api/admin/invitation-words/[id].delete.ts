import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const [existing] = await db.select({ id: invitationWords.id }).from(invitationWords).where(eq(invitationWords.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })
  await db.delete(invitationWords).where(eq(invitationWords.id, id))
  return { ok: true }
})

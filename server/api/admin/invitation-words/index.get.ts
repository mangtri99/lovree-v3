import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const type = getQuery(event).type as string | undefined
  const rows = type
    ? await db.select().from(invitationWords).where(eq(invitationWords.type, type)).orderBy(desc(invitationWords.createdAt))
    : await db.select().from(invitationWords).orderBy(desc(invitationWords.createdAt))
  return { words: rows }
})

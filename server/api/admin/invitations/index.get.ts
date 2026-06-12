import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const rows = await db.select({
    id: invitations.id, slug: invitations.slug, type: invitations.type,
    status: invitations.status, updatedAt: invitations.updatedAt,
  }).from(invitations).where(eq(invitations.ownerId, ownerId))
  return rows
})

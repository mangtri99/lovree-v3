import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, themes } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const rows = await db.select({
    id: invitations.id,
    slug: invitations.slug,
    type: invitations.type,
    status: invitations.status,
    themeId: invitations.themeId,
    themeName: themes.name,
    themeKey: themes.key,
    createdAt: invitations.createdAt,
    updatedAt: invitations.updatedAt,
  })
    .from(invitations)
    .leftJoin(themes, eq(invitations.themeId, themes.id))
    .where(eq(invitations.ownerId, ownerId))
  return rows
})


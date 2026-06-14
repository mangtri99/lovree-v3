import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../db'
import { musicTracks } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const tracks = await db.select({ id: musicTracks.id, name: musicTracks.name, url: musicTracks.url })
    .from(musicTracks).where(eq(musicTracks.ownerId, ownerId)).orderBy(desc(musicTracks.createdAt))
  return { tracks }
})

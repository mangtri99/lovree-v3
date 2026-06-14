import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { musicTracks } from '../../../db/schema'
import { rowBelongsToOwner } from '../../../utils/belongs'

const body = z.object({ name: z.string().trim().min(1).max(120) })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const ownerId = session.user?.id ?? null
  const db = useDb()
  const [track] = await db.select({ id: musicTracks.id, ownerId: musicTracks.ownerId }).from(musicTracks).where(eq(musicTracks.id, id)).limit(1)
  if (!rowBelongsToOwner(track ?? null, ownerId ?? '')) throw createError({ statusCode: 404, message: 'Not found' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  await db.update(musicTracks).set({ name: parsed.data.name }).where(eq(musicTracks.id, id))
  return { ok: true }
})

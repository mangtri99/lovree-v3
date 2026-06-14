import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { musicTracks, invitations } from '../../../db/schema'
import { rowBelongsToOwner } from '../../../utils/belongs'
import { createR2Adapter } from '../../../storage/r2'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const ownerId = session.user?.id ?? null
  const db = useDb()
  const [track] = await db.select({ id: musicTracks.id, ownerId: musicTracks.ownerId, r2Key: musicTracks.r2Key }).from(musicTracks).where(eq(musicTracks.id, id)).limit(1)
  if (!rowBelongsToOwner(track ?? null, ownerId ?? '')) throw createError({ statusCode: 404, message: 'Not found' })

  await db.update(invitations).set({ musicTrackId: null }).where(and(eq(invitations.musicTrackId, id), eq(invitations.ownerId, ownerId!)))

  try {
    const cfg = useRuntimeConfig().r2 as any
    const adapter = createR2Adapter({
      accountId: cfg.accountId, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey,
      bucket: cfg.bucket, publicUrl: cfg.publicUrl,
    })
    await adapter.delete(track!.r2Key)
  } catch { /* best-effort R2 cleanup */ }

  await db.delete(musicTracks).where(eq(musicTracks.id, id))
  return { ok: true }
})

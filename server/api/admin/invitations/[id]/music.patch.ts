import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, musicTracks } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { rowBelongsToOwner } from '../../../../utils/belongs'

const body = z.object({ musicTrackId: z.string().uuid().nullable() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()

  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { musicTrackId } = parsed.data

  if (musicTrackId !== null) {
    const [t] = await db.select({ ownerId: musicTracks.ownerId }).from(musicTracks).where(eq(musicTracks.id, musicTrackId)).limit(1)
    if (!rowBelongsToOwner(t ?? null, session.user?.id ?? '')) throw createError({ statusCode: 400, message: 'Invalid track' })
  }

  await db.update(invitations).set({ musicTrackId, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, musicTrackId }
})

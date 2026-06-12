import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, media } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { mediaBelongsToInvitation } from '../../../../utils/media-belongs'

const body = z.object({ musicMediaId: z.string().uuid().nullable() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()

  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { musicMediaId } = parsed.data

  if (musicMediaId !== null) {
    const [m] = await db.select({ id: media.id, type: media.type, invitationId: media.invitationId })
      .from(media).where(eq(media.id, musicMediaId)).limit(1)
    if (!mediaBelongsToInvitation(m ?? null, id, 'audio')) {
      throw createError({ statusCode: 400, message: 'Invalid media' })
    }
  }

  await db.update(invitations).set({ musicMediaId, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, musicMediaId }
})

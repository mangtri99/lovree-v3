import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { draftToPublished } from '../../../../document/publish'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId, draftDocument: invitations.draftDocument })
    .from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const published = draftToPublished(inv!.draftDocument)
  const publishedAt = new Date()
  await db.update(invitations).set({
    publishedDocument: published, publishedAt, status: 'published', updatedAt: publishedAt,
  }).where(eq(invitations.id, id))
  return { ok: true, publishedAt }
})

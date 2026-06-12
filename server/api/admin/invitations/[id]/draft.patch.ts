import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { validateDraftDocument } from '../../../../document/validate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const body = await readBody(event)
  const doc = validateDraftDocument(body?.document)
  await db.update(invitations).set({ draftDocument: doc, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, document: doc }
})

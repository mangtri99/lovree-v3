import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { validateDesignOverrides } from '../../../../theme/design-validate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()

  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const body = await readBody(event)
  const result = validateDesignOverrides(body?.tokenOverrides)
  if (!result.ok) throw createError({ statusCode: 400, message: result.error })

  await db.update(invitations).set({ tokenOverrides: result.value, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, tokenOverrides: result.value }
})

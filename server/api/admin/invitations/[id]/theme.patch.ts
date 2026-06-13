import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, themes } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'

const body = z.object({ themeId: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })

  const [theme] = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, parsed.data.themeId)).limit(1)
  if (!theme) throw createError({ statusCode: 400, message: 'Invalid theme' })

  await db.update(invitations).set({ themeId: parsed.data.themeId, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, themeId: parsed.data.themeId }
})

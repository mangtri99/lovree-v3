import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

const body = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']).optional(),
  openingGreeting: z.string().max(2000).optional(),
  openingBody: z.string().max(2000).optional(),
  closingGreeting: z.string().max(2000).optional(),
  closingBody: z.string().max(2000).optional(),
  quote: z.string().max(2000).optional(),
  quoteSource: z.string().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()
  const [existing] = await db.select({ id: invitationWords.id }).from(invitationWords).where(eq(invitationWords.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(invitationWords).set(parsed.data).where(eq(invitationWords.id, id))
  return { ok: true }
})

import { z } from 'zod'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

const body = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']),
  openingGreeting: z.string().max(2000).default(''),
  openingBody: z.string().max(2000).default(''),
  closingGreeting: z.string().max(2000).default(''),
  closingBody: z.string().max(2000).default(''),
  quote: z.string().max(2000).default(''),
  quoteSource: z.string().max(2000).default(''),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()
  const [row] = await db.insert(invitationWords).values(parsed.data).returning()
  return row
})

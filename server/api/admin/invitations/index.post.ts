import { z } from 'zod'
import { nanoid } from 'nanoid'
import { useDb } from '../../../db'
import { invitations, themes } from '../../../db/schema'
import { slugify } from '../../../utils/slug'
import { starterDocument } from '../../../registry/starter-sections'

const body = z.object({
  title: z.string().min(1),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']),
  themeId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()
  let themeId = parsed.data.themeId
  if (!themeId) {
    const [t] = await db.select({ id: themes.id }).from(themes).limit(1)
    if (!t) throw createError({ statusCode: 400, message: 'No theme available' })
    themeId = t.id
  }
  const slug = slugify(parsed.data.title, nanoid(6))
  const [inv] = await db.insert(invitations).values({
    ownerId, slug, type: parsed.data.type, themeId,
    status: 'draft', draftDocument: starterDocument(parsed.data.type),
  }).returning({ id: invitations.id, slug: invitations.slug })
  return inv
})

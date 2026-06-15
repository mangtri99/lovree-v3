import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, themes, invitationWords } from '../../../db/schema'
import { slugify } from '../../../utils/slug'
import { starterDocument } from '../../../registry/starter-sections'

const body = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']),
  themeId: z.string().uuid(),
  invitationWordId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()

  const slug = slugify(parsed.data.slug)
  if (!slug) throw createError({ statusCode: 400, message: 'Slug tidak valid' })
  const [taken] = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.slug, slug)).limit(1)
  if (taken) throw createError({ statusCode: 409, message: 'Slug sudah dipakai' })

  const [theme] = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, parsed.data.themeId)).limit(1)
  if (!theme) throw createError({ statusCode: 400, message: 'Tema tidak valid' })

  const [word] = await db.select().from(invitationWords).where(eq(invitationWords.id, parsed.data.invitationWordId)).limit(1)
  if (!word) throw createError({ statusCode: 400, message: 'Template konten tidak valid' })

  const [inv] = await db.insert(invitations).values({
    ownerId, slug, type: parsed.data.type, themeId: parsed.data.themeId,
    status: 'draft', draftDocument: starterDocument(parsed.data.type, word),
  }).returning({ id: invitations.id, slug: invitations.slug })
  return inv
})

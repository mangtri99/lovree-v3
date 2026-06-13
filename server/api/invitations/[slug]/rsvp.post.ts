import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, guests, rsvps } from '../../../db/schema'

const body = z.object({
  name: z.string().trim().min(1).max(100),
  attendance: z.enum(['yes', 'no', 'maybe']),
  message: z.string().max(1000).optional(),
  guest: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, status: invitations.status }).from(invitations).where(eq(invitations.slug, slug)).limit(1)
  if (!inv || inv.status !== 'published') throw createError({ statusCode: 404, message: 'Not found' })

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { name, attendance, message, guest } = parsed.data

  let guestId: string | null = null
  const code = (guest ?? '').trim()
  if (code) {
    const [g] = await db.select({ id: guests.id }).from(guests).where(and(eq(guests.invitationId, inv.id), eq(guests.code, code))).limit(1)
    guestId = g?.id ?? null
  }

  await db.insert(rsvps).values({ invitationId: inv.id, guestId, name, attendance, message: message ?? '' })
  return { ok: true, entry: { name, message: message ?? '', attendance } }
})

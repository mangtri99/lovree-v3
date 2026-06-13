import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from '../../../../../db'
import { invitations, guests, sessions } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { rowBelongsToInvitation } from '../../../../../utils/belongs'
import { generateGuestCode } from '../../../../../utils/guest-code'

const body = z.object({
  names: z.array(z.string().transform((s) => s.trim()).refine((s) => s.length > 0, 'empty name')).min(1).max(500),
  groupLabel: z.string().optional(),
  sessionId: z.string().uuid().nullable().optional(),
})

// Postgres unique_violation. Only a code collision should be retried; any other
// DB error must surface, not be masked as "could not generate a unique code".
function isUniqueViolation(e: any): boolean {
  return e?.code === '23505' || /duplicate key|unique/i.test(e?.message ?? '')
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { names, groupLabel, sessionId } = parsed.data

  if (sessionId) {
    const [s] = await db.select({ invitationId: sessions.invitationId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    if (!rowBelongsToInvitation(s ?? null, id)) throw createError({ statusCode: 400, message: 'Invalid session' })
  }

  // Bulk insert is not atomic: the neon-http driver is stateless and has no
  // transaction support, so a mid-batch failure may leave earlier guests inserted.
  // The client re-fetches the list afterward, so it always sees the real state.
  const created: Array<{ id: string; name: string; code: string }> = []
  for (const name of names) {
    let inserted: { id: string; name: string; code: string } | undefined
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const code = generateGuestCode(name, nanoid(5))
      try {
        const [row] = await db.insert(guests).values({ invitationId: id, name, code, groupLabel: groupLabel || null, sessionId: sessionId ?? null })
          .returning({ id: guests.id, name: guests.name, code: guests.code })
        inserted = row
      } catch (e: any) {
        if (!isUniqueViolation(e)) throw e // real error → surface it, don't retry/mask
        if (attempt === 4) throw createError({ statusCode: 500, message: 'Could not generate a unique code' })
      }
    }
    if (inserted) created.push(inserted)
  }
  return { guests: created }
})

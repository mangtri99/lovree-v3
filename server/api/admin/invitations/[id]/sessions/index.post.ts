import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, sessions } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'

const body = z.object({
  targetEvent: z.string().min(1),
  timeStart: z.string().default(''),
  timeEnd: z.string().default(''),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const [row] = await db.insert(sessions).values({ invitationId: id, ...parsed.data })
    .returning({ id: sessions.id, targetEvent: sessions.targetEvent, timeStart: sessions.timeStart, timeEnd: sessions.timeEnd })
  return row
})

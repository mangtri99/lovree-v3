import { loadInvitationBySlug } from '../../utils/invitation'
import { canView } from '../../utils/visibility'
import { guests } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../db'
import { resolveGuestName } from '../../utils/guest'
import { publishedEtag } from '../../utils/etag'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const inv = await loadInvitationBySlug(slug)
  if (!inv) throw createError({ statusCode: 404, message: 'Not found' })

  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  if (!canView({ status: inv.status, ownerId: inv.ownerId! }, viewerId)) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // published invitations change rarely; cache + revalidate on save (Phase 2 invalidation)
  if (inv.status === 'published') {
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
    setHeader(event, 'ETag', publishedEtag(inv.id, inv.publishedAt))
  }

  const rawGuest = getQuery(event).guest
  const guestParam = Array.isArray(rawGuest) ? rawGuest[0] : (rawGuest as string | undefined)
  const guestName = await resolveGuestName(guestParam ?? null, async (code) => {
    const g = await useDb().select().from(guests).where(and(eq(guests.invitationId, inv.id), eq(guests.code, code))).limit(1)
    return g[0]?.name ?? null
  })

  const { ownerId, publishedAt, ...publicData } = inv
  return { ...publicData, guestName }
})

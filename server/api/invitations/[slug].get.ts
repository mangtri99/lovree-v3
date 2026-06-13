import { loadInvitationBySlug } from '../../utils/invitation'
import { canView } from '../../utils/visibility'
import { guests, sessions, rsvps } from '../../db/schema'
import { eq, and, desc, isNotNull, ne } from 'drizzle-orm'
import { useDb } from '../../db'
import { applyGuestSession } from '../../utils/session-apply'
import { toGuestbookEntries } from '../../utils/rsvp'
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
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600')
    setHeader(event, 'ETag', publishedEtag(inv.id, inv.publishedAt))
  }

  const rawGuest = getQuery(event).guest
  const guestParam = Array.isArray(rawGuest) ? rawGuest[0] : (rawGuest as string | undefined)
  const code = (guestParam ?? '').trim()

  let guestRow: { name: string; sessionId: string | null } | null = null
  if (code) {
    const g = await useDb().select({ name: guests.name, sessionId: guests.sessionId })
      .from(guests).where(and(eq(guests.invitationId, inv.id), eq(guests.code, code))).limit(1)
    guestRow = g[0] ?? null
  }
  const guestName = code ? (guestRow?.name ?? code) : 'Tamu Undangan'

  let sections = inv.sections
  if (guestRow?.sessionId) {
    const [s] = await useDb().select({ targetEvent: sessions.targetEvent, timeStart: sessions.timeStart, timeEnd: sessions.timeEnd })
      .from(sessions).where(and(eq(sessions.id, guestRow.sessionId), eq(sessions.invitationId, inv.id))).limit(1)
    if (s) sections = applyGuestSession(inv.sections, s)
  }

  const rsvpRows = await useDb().select({ name: rsvps.name, attendance: rsvps.attendance, message: rsvps.message })
    .from(rsvps)
    .where(and(eq(rsvps.invitationId, inv.id), isNotNull(rsvps.message), ne(rsvps.message, '')))
    .orderBy(desc(rsvps.createdAt))
    .limit(50)
  const guestbook = toGuestbookEntries(rsvpRows)

  const { ownerId, publishedAt, ...publicData } = inv
  return { ...publicData, sections, guestName, guestbook }
})

import { loadInvitationBySlug } from '../../utils/invitation'
import { canView } from '../../utils/visibility'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const inv = await loadInvitationBySlug(slug)
  if (!inv) throw createError({ statusCode: 404, message: 'Not found' })

  const session = await getUserSession(event)
  const viewerId = (session as any)?.user?.id ?? null
  if (!canView({ status: inv.status, ownerId: inv.ownerId! }, viewerId)) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // published invitations change rarely; cache + revalidate on save (Phase 2 invalidation)
  if (inv.status === 'published') {
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  }
  const { ownerId, ...publicData } = inv
  return publicData
})

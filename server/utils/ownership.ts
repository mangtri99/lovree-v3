export function isOwner(inv: { ownerId: string }, viewerId: string | null): boolean {
  return viewerId != null && inv.ownerId === viewerId
}

// Convenience for handlers: throws a 404 (not 403) when not the owner, so existence isn't leaked.
export function assertOwnerOr404(inv: { ownerId: string } | null, viewerId: string | null) {
  if (!inv || !isOwner(inv, viewerId)) throw createError({ statusCode: 404, message: 'Not found' })
  return inv
}

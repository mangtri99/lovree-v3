export function canView(inv: { status: string; ownerId: string }, viewerId: string | null) {
  return inv.status === 'published' || inv.ownerId === viewerId
}

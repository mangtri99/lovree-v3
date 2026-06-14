// True iff the row exists and belongs to the given invitation. Used to reject a
// guestId/sessionId from another invitation before mutating.
export function rowBelongsToInvitation(row: { invitationId: string } | null, invitationId: string): boolean {
  return !!row && row.invitationId === invitationId
}

// True iff the row exists and is owned by the user. Used to reject another user's
// music track from the library/select endpoints.
export function rowBelongsToOwner(row: { ownerId: string } | null, ownerId: string): boolean {
  return !!row && row.ownerId === ownerId
}

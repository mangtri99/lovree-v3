// True iff the row exists and belongs to the given invitation. Used to reject a
// guestId/sessionId from another invitation before mutating.
export function rowBelongsToInvitation(row: { invitationId: string } | null, invitationId: string): boolean {
  return !!row && row.invitationId === invitationId
}

// True iff `media` exists, is of the expected kind, and belongs to the invitation.
// Used to reject pointing an invitation's music at another invitation's (or the
// wrong type of) media before persisting musicMediaId.
export function mediaBelongsToInvitation(
  media: { id: string; type: string; invitationId: string } | null,
  invitationId: string,
  kind: string,
): boolean {
  return !!media && media.type === kind && media.invitationId === invitationId
}

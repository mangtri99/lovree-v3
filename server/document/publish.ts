import { validateDraftDocument } from './validate'
import type { InvitationDocument } from './types'

// Snapshot the draft into the published document. Re-validates and deep-copies
// (via validateContent rebuilding content) so the snapshot is independent and clean.
export function draftToPublished(draft: unknown): InvitationDocument {
  return validateDraftDocument(draft)
}

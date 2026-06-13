import { describe, it, expect } from 'vitest'
import { rowBelongsToInvitation } from '../../server/utils/belongs'

describe('rowBelongsToInvitation', () => {
  it('true when the row belongs to the invitation', () => {
    expect(rowBelongsToInvitation({ invitationId: 'inv1' }, 'inv1')).toBe(true)
  })
  it('false for another invitation', () => {
    expect(rowBelongsToInvitation({ invitationId: 'other' }, 'inv1')).toBe(false)
  })
  it('false for a missing row', () => {
    expect(rowBelongsToInvitation(null, 'inv1')).toBe(false)
  })
})

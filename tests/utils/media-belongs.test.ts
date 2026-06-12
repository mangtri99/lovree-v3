import { describe, it, expect } from 'vitest'
import { mediaBelongsToInvitation } from '../../server/utils/media-belongs'

const row = (over = {}) => ({ id: 'm1', type: 'audio', invitationId: 'inv1', ...over })

describe('mediaBelongsToInvitation', () => {
  it('accepts audio media owned by the invitation', () => {
    expect(mediaBelongsToInvitation(row(), 'inv1', 'audio')).toBe(true)
  })
  it('rejects another invitation\'s media', () => {
    expect(mediaBelongsToInvitation(row({ invitationId: 'other' }), 'inv1', 'audio')).toBe(false)
  })
  it('rejects the wrong kind', () => {
    expect(mediaBelongsToInvitation(row({ type: 'image' }), 'inv1', 'audio')).toBe(false)
  })
  it('rejects a missing row', () => {
    expect(mediaBelongsToInvitation(null, 'inv1', 'audio')).toBe(false)
  })
})

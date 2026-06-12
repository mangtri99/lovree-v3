import { describe, it, expect } from 'vitest'
import { isOwner } from '../../server/utils/ownership'

describe('isOwner', () => {
  it('true only when ids match and viewer is set', () => {
    expect(isOwner({ ownerId: 'o1' }, 'o1')).toBe(true)
    expect(isOwner({ ownerId: 'o1' }, 'o2')).toBe(false)
    expect(isOwner({ ownerId: 'o1' }, null)).toBe(false)
  })
})

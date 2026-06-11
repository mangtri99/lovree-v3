import { describe, it, expect } from 'vitest'
import { canView } from '../../server/utils/visibility'

describe('canView', () => {
  it('anyone can view published', () => {
    expect(canView({ status: 'published', ownerId: 'o1' }, null)).toBe(true)
  })
  it('non-owner cannot view draft', () => {
    expect(canView({ status: 'draft', ownerId: 'o1' }, 'o2')).toBe(false)
    expect(canView({ status: 'draft', ownerId: 'o1' }, null)).toBe(false)
  })
  it('owner can view their draft', () => {
    expect(canView({ status: 'draft', ownerId: 'o1' }, 'o1')).toBe(true)
  })
})

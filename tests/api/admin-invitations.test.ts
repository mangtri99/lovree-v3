import { describe, it, expect } from 'vitest'
import { slugify } from '../../server/utils/slug'

describe('slugify', () => {
  it('lowercases, hyphenates, strips non-alphanumerics', () => {
    expect(slugify('Willy & Debby!')).toBe('willy-debby')
  })
  it('appends a suffix for uniqueness when provided', () => {
    expect(slugify('Hero', 'ab12')).toBe('hero-ab12')
  })
})

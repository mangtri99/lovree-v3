import { describe, it, expect } from 'vitest'
import { publishedEtag } from '../../server/utils/etag'

describe('publishedEtag', () => {
  it('is stable for the same publish time and changes when it changes', () => {
    const a = publishedEtag('i1', new Date('2026-01-01T00:00:00Z'))
    const b = publishedEtag('i1', new Date('2026-01-01T00:00:00Z'))
    const c = publishedEtag('i1', new Date('2026-02-01T00:00:00Z'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
  it('returns a quoted etag string', () => {
    expect(publishedEtag('i1', new Date(0))).toMatch(/^"[\w-]+"$/)
  })
})

import { describe, it, expect } from 'vitest'
import { sectionRegistry } from '../../server/registry/sections'

describe('field descriptors', () => {
  it('every section defines a fields descriptor map', () => {
    for (const [type, def] of Object.entries(sectionRegistry)) {
      expect((def as any).fields, `missing fields for ${type}`).toBeTruthy()
    }
  })
  it('hero exposes title/coupleName/date with types', () => {
    const f = (sectionRegistry.hero as any).fields
    expect(f.title.type).toBe('text')
    expect(f.date.type).toBe('date')
  })
})

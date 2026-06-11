import { describe, it, expect } from 'vitest'
import { SECTION_TYPES } from '../../server/registry/sections'
import { sectionComponents } from '../../app/components/invitation/sectionComponents'

describe('section map alignment', () => {
  it('every registry section type has a component', () => {
    for (const t of SECTION_TYPES) expect(sectionComponents[t], `missing component for ${t}`).toBeTruthy()
  })
  it('every mapped component corresponds to a registry type', () => {
    for (const t of Object.keys(sectionComponents)) expect(SECTION_TYPES).toContain(t)
  })
})

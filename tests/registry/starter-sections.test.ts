import { describe, it, expect } from 'vitest'
import { starterDocument, STARTER_SECTIONS } from '../../server/registry/starter-sections'
import { defaultContent } from '../../server/registry/sections'

describe('starterDocument', () => {
  it('wedding seeds the wedding starter list in order, hero first', () => {
    const doc = starterDocument('wedding')
    expect(doc.sections[0].type).toBe('hero')
    expect(doc.sections.map((s) => s.type)).toEqual(STARTER_SECTIONS.wedding)
  })

  it('each section is enabled, has default content and a unique non-empty id', () => {
    const doc = starterDocument('wedding')
    const hero = doc.sections[0]
    expect(hero.enabled).toBe(true)
    expect(hero.content).toEqual(defaultContent('hero'))
    const ids = doc.sections.map((s) => s.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to the wedding starter for an unknown type', () => {
    expect(starterDocument('nope').sections.map((s) => s.type)).toEqual(STARTER_SECTIONS.wedding)
  })

  it('birthday omits couple and love_gift', () => {
    const types = starterDocument('birthday').sections.map((s) => s.type)
    expect(types).not.toContain('couple')
    expect(types).not.toContain('love_gift')
  })
})

import { describe, it, expect } from 'vitest'
import { starterDocument, STARTER_SECTIONS, STARTER_CONFIG } from '../../server/registry/starter-sections'
import { validateContent } from '../../server/registry/sections'

describe('starterDocument', () => {
  it('seeds the configured sections in order, hero first', () => {
    const doc = starterDocument('wedding')
    expect(doc.sections[0].type).toBe('hero')
    expect(doc.sections.map((s) => s.type)).toEqual(STARTER_CONFIG.wedding.sections)
  })

  it('seeds type-appropriate hero title + schema-valid content', () => {
    const doc = starterDocument('birthday')
    const hero = doc.sections.find((s) => s.type === 'hero')!
    expect(hero.content.title).toBe('Ulang Tahun')
    expect(hero.content).toEqual(validateContent('hero', STARTER_CONFIG.birthday.content?.hero ?? {}))
    expect(hero.enabled).toBe(true)
  })

  it('each type has the right composition', () => {
    const types = (t: string) => starterDocument(t).sections.map((s) => s.type)
    expect(types('birthday')).not.toContain('couple')
    expect(types('birthday')).not.toContain('love_gift')
    expect(types('metatah')).not.toContain('love_gift')
    expect(types('baby_3mo')).toContain('couple')
    expect(types('wedding')).toContain('love_gift')
  })

  it('gives unique non-empty ids', () => {
    const ids = starterDocument('wedding').sections.map((s) => s.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to the wedding starter for an unknown type', () => {
    expect(starterDocument('nope').sections.map((s) => s.type)).toEqual(STARTER_CONFIG.wedding.sections)
  })

  it('STARTER_SECTIONS still maps a type to its section list (back-compat)', () => {
    expect(STARTER_SECTIONS.wedding).toEqual(STARTER_CONFIG.wedding.sections)
  })

  it('baby_3mo hero title differs from wedding', () => {
    expect(starterDocument('baby_3mo').sections[0].content.title).toBe('Tiga Bulanan')
    expect(starterDocument('wedding').sections[0].content.title).toBe('The Wedding Of')
  })
})

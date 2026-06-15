import { describe, it, expect } from 'vitest'
import { starterDocument, STARTER_SECTIONS, STARTER_CONFIG, wordToContent } from '../../server/registry/starter-sections'
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

const WORD = { openingGreeting: 'Halo', openingBody: 'Isi pembuka', closingGreeting: 'Salam', closingBody: 'Isi penutup', quote: 'Kutipan', quoteSource: 'Sumber' }

describe('wordToContent', () => {
  it('maps non-empty fields, omits empty', () => {
    expect(wordToContent(WORD)).toEqual({
      opening: { greeting: 'Halo', body: 'Isi pembuka' },
      closing: { greeting: 'Salam', body: 'Isi penutup' },
      quote: { text: 'Kutipan', source: 'Sumber' },
    })
    expect(wordToContent({ openingGreeting: 'Hi' })).toEqual({ opening: { greeting: 'Hi' }, closing: {}, quote: {} })
  })
})

describe('starterDocument with a word', () => {
  it('seeds opening/closing/quote from the word', () => {
    const doc = starterDocument('wedding', WORD)
    const opening = doc.sections.find((s) => s.type === 'opening')!.content
    const closing = doc.sections.find((s) => s.type === 'closing')!.content
    const quote = doc.sections.find((s) => s.type === 'quote')!.content
    expect(opening.greeting).toBe('Halo'); expect(opening.body).toBe('Isi pembuka')
    expect(closing.greeting).toBe('Salam'); expect(closing.body).toBe('Isi penutup')
    expect(quote.text).toBe('Kutipan'); expect(quote.source).toBe('Sumber')
  })
  it('keeps the type default for empty word fields', () => {
    const def = starterDocument('wedding').sections.find((s) => s.type === 'opening')!.content
    const seeded = starterDocument('wedding', { openingBody: '' }).sections.find((s) => s.type === 'opening')!.content
    expect(seeded.greeting).toBe(def.greeting)
  })
})

import { describe, it, expect } from 'vitest'
import { sectionRegistry, validateContent, SECTION_TYPES } from '../../server/registry/sections'

describe('section registry', () => {
  it('defines all MVP section types', () => {
    expect(SECTION_TYPES).toEqual(expect.arrayContaining([
      'hero','opening','couple','event','countdown','quote',
      'love_gift','gallery','closing','info','rsvp','guestbook','footer',
    ]))
  })

  it('validates hero content and fills defaults for missing fields', () => {
    const out = validateContent('hero', { title: 'Walimah', coupleName: 'Willy & Debby' })
    expect(out.title).toBe('Walimah')
    expect(out.date).toBe('') // default applied
  })

  it('does not throw on a malformed blob; falls back to defaults', () => {
    const out = validateContent('countdown', { targetDate: 12345 })
    expect(out.targetDate).toBe('') // invalid -> default
  })

  it('parses gallery youtube items', () => {
    const out = validateContent('gallery', { items: [{ type: 'youtube', videoId: 'dQw4w9WgXcQ' }] })
    expect(out.items[0]).toEqual({ type: 'youtube', videoId: 'dQw4w9WgXcQ' })
  })

  it('rejects a javascript: url in event mapsUrl (falls back to defaults)', () => {
    const out = validateContent('event', { events: [{ name: 'A', mapsUrl: 'javascript:alert(1)' }] })
    // invalid url makes the blob fail validation -> full defaults (empty events)
    expect(out.events).toEqual([])
  })
})

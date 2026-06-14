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

  it('rejects a javascript: url in event mapsUrl (falls back to defaults)', () => {
    const out = validateContent('event', { events: [{ name: 'A', mapsUrl: 'javascript:alert(1)' }] })
    // invalid url makes the blob fail validation -> full defaults (empty events)
    expect(out.events).toEqual([])
  })
})

describe('gallery (images only)', () => {
  it('defaults to no items', () => {
    expect(validateContent('gallery', {})).toEqual({ items: [] })
  })
  it('coerces items to {mediaId,url}, drops non-object items, never resets', () => {
    const out = validateContent('gallery', { items: [
      { mediaId: 'm1', url: 'https://cdn/x.jpg' },
      {},
      { type: 'youtube', videoId: 'abc' },
      'bogus',
    ] })
    expect(out.items).toEqual([
      { mediaId: 'm1', url: 'https://cdn/x.jpg' },
      { mediaId: '', url: '' },
      { mediaId: '', url: '' },
    ])
  })
})

describe('video section', () => {
  it('defaults to empty videos', () => {
    expect(validateContent('video', {})).toEqual({ videos: [] })
  })
  it('preserves videoId rows and defaults a blank one', () => {
    expect(validateContent('video', { videos: [{ videoId: 'dQw4w9WgXcQ' }, {}] }))
      .toEqual({ videos: [{ videoId: 'dQw4w9WgXcQ' }, { videoId: '' }] })
  })
})

describe('custom section', () => {
  it('defaults to an empty title and no rows', () => {
    const out = validateContent('custom', {})
    expect(out).toEqual({ title: '', items: [] })
  })
  it('preserves filled rows and defaults an empty row\'s fields (section not reset)', () => {
    const out = validateContent('custom', { title: 'Dress Code', items: [{ label: 'Pria', value: 'Batik' }, {}] })
    expect(out.title).toBe('Dress Code')
    expect(out.items).toEqual([{ label: 'Pria', value: 'Batik' }, { label: '', value: '' }])
  })
})

describe('couple person photo', () => {
  it('defaults photo to an empty object', () => {
    const out = validateContent('couple', { people: [{ name: 'Willy' }] })
    expect(out.people[0].photo).toEqual({ mediaId: '', url: '' })
  })
  it('preserves a set photo', () => {
    const out = validateContent('couple', { people: [{ name: 'W', photo: { mediaId: 'm1', url: 'https://cdn/p.jpg' } }] })
    expect(out.people[0].photo).toEqual({ mediaId: 'm1', url: 'https://cdn/p.jpg' })
  })
})

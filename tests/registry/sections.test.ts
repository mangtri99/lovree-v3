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

  it('countdown defaults title + location and exposes them as text fields', () => {
    expect(validateContent('countdown', {})).toEqual({ targetDate: '', title: '', location: '' })
    expect((sectionRegistry as any).countdown.fields.title.type).toBe('text')
    expect((sectionRegistry as any).countdown.fields.location.type).toBe('text')
  })

  it('rejects a javascript: url in event mapsUrl (falls back to defaults)', () => {
    const out = validateContent('event', { events: [{ name: 'A', mapsUrl: 'javascript:alert(1)' }] })
    // invalid url makes the blob fail validation -> full defaults (empty events)
    expect(out.events).toEqual([])
  })
})

describe('gallery (images only)', () => {
  it('defaults to no items', () => {
    expect(validateContent('gallery', {})).toEqual({ title: '', items: [] })
  })
  it('gallery has a title text field', () => {
    expect((sectionRegistry as any).gallery.fields.title.type).toBe('text')
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

describe('package A schema fields', () => {
  it('hero defaults dateFormat', () => {
    expect(validateContent('hero', {}).dateFormat).toBe('DD MMMM YYYY')
  })
  it('event item defaults dateFormat', () => {
    const out = validateContent('event', { events: [{ name: 'Resepsi' }] })
    expect(out.events[0].dateFormat).toBe('DD MMMM YYYY')
  })
  it('closing keeps greeting + body', () => {
    expect(validateContent('closing', { greeting: 'Om Swastiastu', body: 'x' })).toEqual({ greeting: 'Om Swastiastu', body: 'x' })
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

describe('package B schema', () => {
  it('hero defaults backgroundImage to empty', () => {
    expect(validateContent('hero', {}).backgroundImage).toEqual({ mediaId: '', url: '' })
  })
  it('hero_slideshow defaults', () => {
    expect(validateContent('hero_slideshow', {})).toEqual({ title: '', coupleName: '', date: '', dateFormat: 'DD MMMM YYYY', images: [] })
  })
  it('hero_slideshow keeps valid images, drops malformed', () => {
    const out = validateContent('hero_slideshow', { images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, 'bogus'] })
    expect(out.images).toEqual([{ mediaId: 'm', url: 'https://cdn/a.jpg' }])
  })
})

describe('package C footer richtext', () => {
  it('footer.text uses the richtext field type', () => {
    expect((sectionRegistry as any).footer.fields.text.type).toBe('richtext')
  })
})

describe('member section', () => {
  it('defaults to an empty members list', () => {
    expect(validateContent('member', {})).toEqual({ members: [] })
  })
  it('round-trips a group with a participant and defaults missing fields', () => {
    const out = validateContent('member', {
      members: [{ parents: 'Bpk X & Ibu Y', childOrder: 'Anak ke-1', peoples: [{ name: 'A', instagram: 'a' }] }],
    })
    expect(out.members).toEqual([
      { parents: 'Bpk X & Ibu Y', childOrder: 'Anak ke-1', peoples: [{ name: 'A', instagram: 'a', photo: { mediaId: '', url: '' } }] },
    ])
  })
  it('is registered with the Peserta label and a nested list field', () => {
    expect((sectionRegistry as any).member.label).toBe('Peserta')
    expect((sectionRegistry as any).member.fields.members.type).toBe('list')
    expect((sectionRegistry as any).member.fields.members.itemFields.peoples.type).toBe('list')
  })
})

import { describe, it, expect } from 'vitest'
import { resolveSeo } from '../../server/seo/resolve'

const base = {
  slug: 'budi-ani',
  siteUrl: 'https://lovree.test',
  seo: { title: '', description: '', ogImage: { mediaId: '', url: '' } },
  sections: [
    { type: 'hero', content: { coupleName: 'Budi & Ani', date: '2026-09-01' } },
    { type: 'event', content: { events: [{ venue: 'Bali' }] } },
    { type: 'gallery', content: { items: [{ mediaId: 'm', url: 'https://cdn/x.jpg' }] } },
  ],
}

describe('resolveSeo', () => {
  it('auto-derives a wedding title/description from content', () => {
    const r = resolveSeo({ type: 'wedding', ...base })
    expect(r.title).toBe('Undangan Pernikahan Budi & Ani')
    expect(r.description).toContain('pernikahan Budi & Ani')
    expect(r.description).toContain('Bali')
    expect(r.canonical).toBe('https://lovree.test/u/budi-ani')
  })

  it('uses per-type templates', () => {
    expect(resolveSeo({ type: 'metatah', ...base }).title).toBe('Undangan Metatah Budi & Ani')
    expect(resolveSeo({ type: 'baby_3mo', ...base }).title).toBe('Undangan Tiga Bulanan Budi & Ani')
    expect(resolveSeo({ type: 'birthday', ...base }).title).toBe('Undangan Ulang Tahun Budi & Ani')
    expect(resolveSeo({ type: 'wedding_metatah', ...base }).title).toBe('Undangan Pernikahan Budi & Ani')
    expect(resolveSeo({ type: 'nope', ...base }).title).toBe('Undangan Budi & Ani')
  })

  it('per-field override wins, other fields still auto-derive', () => {
    const r = resolveSeo({ type: 'wedding', ...base, seo: { title: 'Custom Judul', description: '', ogImage: { mediaId: '', url: '' } } })
    expect(r.title).toBe('Custom Judul')
    expect(r.description).toContain('pernikahan Budi & Ani')
  })

  it('ogImage fallback chain: override > gallery first > og-default', () => {
    expect(resolveSeo({ type: 'wedding', ...base, seo: { title: '', description: '', ogImage: { mediaId: 'x', url: 'https://cdn/override.jpg' } } }).ogImage).toBe('https://cdn/override.jpg')
    expect(resolveSeo({ type: 'wedding', ...base }).ogImage).toBe('https://cdn/x.jpg')
    const noGallery = { ...base, sections: base.sections.filter((s) => s.type !== 'gallery') }
    expect(resolveSeo({ type: 'wedding', ...noGallery }).ogImage).toBe('https://lovree.test/og-default.jpg')
  })

  it('handles an empty couple name gracefully (no dangling space)', () => {
    const empty = { ...base, sections: [{ type: 'hero', content: { coupleName: '', date: '' } }] }
    const r = resolveSeo({ type: 'wedding', ...empty })
    expect(r.title).toBe('Undangan Pernikahan')
    expect(r.title).not.toMatch(/\s$/)
    expect(r.description).toContain('pernikahan kami')
  })
})

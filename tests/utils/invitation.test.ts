import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

describe('assembleInvitation', () => {
  const theme = { tokens: { color: { primary: '#abc' } } }
  const inv = { id: 'i1', slug: 'x', type: 'wedding', status: 'published', tokenOverrides: { color: { primary: '#111' } } }

  it('orders enabled sections by position and drops disabled', () => {
    const rows = [
      { type: 'quote', position: 2, enabled: true, content: {} },
      { type: 'hero', position: 0, enabled: true, content: { title: 'T' } },
      { type: 'gallery', position: 1, enabled: false, content: {} },
    ]
    const out = assembleInvitation(inv as any, theme as any, rows as any)
    expect(out.sections.map(s => s.type)).toEqual(['hero', 'quote'])
  })

  it('validates content and exposes resolved css vars', () => {
    const out = assembleInvitation(inv as any, theme as any, [{ type: 'hero', position: 0, enabled: true, content: { title: 'T' } }] as any)
    expect(out.sections[0].content.title).toBe('T')
    expect(out.sections[0].content.coupleName).toBe('') // default filled
    expect(out.cssVars['--color-primary']).toBe('#111') // override wins
  })
})

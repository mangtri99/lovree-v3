import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

describe('assembleInvitation', () => {
  const theme = { tokens: { color: { primary: '#abc' } } }
  const inv = { id: 'i1', slug: 'x', type: 'wedding', status: 'published', tokenOverrides: { color: { primary: '#111' } } }

  it('orders enabled sections from the document and drops disabled', () => {
    const sections = [
      { id: 'a', type: 'hero', enabled: true, content: { title: 'T' } },
      { id: 'b', type: 'gallery', enabled: false, content: {} },
      { id: 'c', type: 'quote', enabled: true, content: {} },
    ]
    const out = assembleInvitation(inv as any, theme as any, sections as any)
    expect(out.sections.map((s) => s.type)).toEqual(['hero', 'quote'])
  })

  it('validates content and exposes resolved css vars', () => {
    const out = assembleInvitation(inv as any, theme as any, [{ id: 'a', type: 'hero', enabled: true, content: { title: 'T' } }] as any)
    expect(out.sections[0].content.title).toBe('T')
    expect(out.sections[0].content.coupleName).toBe('')
    expect(out.cssVars['--color-primary']).toBe('#111')
  })
})

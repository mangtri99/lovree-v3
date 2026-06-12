import { describe, it, expect } from 'vitest'
import { validateDraftDocument } from '../../server/document/validate'

describe('validateDraftDocument', () => {
  it('keeps known sections, fills content defaults, preserves id/enabled/order', () => {
    const out = validateDraftDocument({
      sections: [
        { id: 'a', type: 'hero', enabled: true, content: { title: 'T' } },
        { id: 'b', type: 'quote', enabled: false, content: {} },
      ],
    })
    expect(out.sections.map((s) => s.id)).toEqual(['a', 'b'])
    expect(out.sections[0].content.title).toBe('T')
    expect(out.sections[0].content.coupleName).toBe('') // default filled
    expect(out.sections[1].enabled).toBe(false)
  })
  it('drops unknown section types', () => {
    const out = validateDraftDocument({ sections: [{ id: 'x', type: 'nope', enabled: true, content: {} }] })
    expect(out.sections).toEqual([])
  })
  it('tolerates a malformed root, returning an empty document', () => {
    expect(validateDraftDocument(null as any)).toEqual({ sections: [] })
    expect(validateDraftDocument({} as any)).toEqual({ sections: [] })
  })
  it('generates an id when a section is missing one', () => {
    const out = validateDraftDocument({ sections: [{ type: 'hero', enabled: true, content: {} } as any] })
    expect(out.sections[0].id).toBeTruthy()
  })
})

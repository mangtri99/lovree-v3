import { describe, it, expect } from 'vitest'
import { createEditorState } from '../../app/composables/useInvitationEditor'

describe('createEditorState', () => {
  it('adds, toggles, moves, and removes sections', () => {
    const s = createEditorState({ sections: [] })
    s.addSection('hero')
    s.addSection('quote')
    expect(s.doc.sections.map((x) => x.type)).toEqual(['hero', 'quote'])

    const heroId = s.doc.sections[0].id
    s.toggle(heroId)
    expect(s.doc.sections[0].enabled).toBe(false)

    s.move(0, 1) // move hero down
    expect(s.doc.sections.map((x) => x.type)).toEqual(['quote', 'hero'])

    s.remove(heroId)
    expect(s.doc.sections.map((x) => x.type)).toEqual(['quote'])
  })
  it('setField updates nested content', () => {
    const s = createEditorState({ sections: [] })
    s.addSection('hero')
    const id = s.doc.sections[0].id
    s.setField(id, 'title', 'Halo')
    expect(s.doc.sections[0].content.title).toBe('Halo')
  })
})

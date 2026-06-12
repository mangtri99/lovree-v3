import { describe, it, expect } from 'vitest'
import { draftToPublished } from '../../server/document/publish'

describe('draftToPublished', () => {
  it('produces a validated deep copy independent of the draft', () => {
    const draft = { sections: [{ id: 'a', type: 'hero', enabled: true, content: { title: 'T' } }] }
    const published = draftToPublished(draft)
    expect(published.sections[0].content.title).toBe('T')
    // mutating the draft afterwards must not affect the snapshot
    draft.sections[0].content.title = 'CHANGED'
    expect(published.sections[0].content.title).toBe('T')
  })
  it('drops unknown types via validation', () => {
    const published = draftToPublished({ sections: [{ id: 'x', type: 'nope', enabled: true, content: {} }] })
    expect(published.sections).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { reconcileSections } from '../../app/composables/useReconcile'

const doc = (sections: any[]) => ({ sections })

describe('reconcileSections', () => {
  it('returns null when an edit landed mid-flight (current differs from sent)', () => {
    const current = doc([{ id: 'a' }, { id: 'b' }])
    const sent = JSON.stringify(doc([{ id: 'a' }]))
    expect(reconcileSections(sent, current, [{ id: 'a' }])).toBeNull()
  })
  it('returns null when the server document is identical (prevents watcher loop)', () => {
    const current = doc([{ id: 'a' }])
    const sent = JSON.stringify(current)
    expect(reconcileSections(sent, current, [{ id: 'a' }])).toBeNull()
  })
  it('returns the server sections when the server dropped a bad item', () => {
    const current = doc([{ id: 'a' }, {}])
    const sent = JSON.stringify(current)
    const server = [{ id: 'a' }]
    expect(reconcileSections(sent, current, server)).toEqual(server)
  })
})

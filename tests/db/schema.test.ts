import { describe, it, expect } from 'vitest'
import * as schema from '../../server/db/schema'

describe('schema', () => {
  it('exports the expected tables (no separate sections table)', () => {
    for (const t of ['users', 'themes', 'invitations', 'guests', 'rsvps', 'media']) {
      expect(schema, `missing table ${t}`).toHaveProperty(t)
    }
    expect(schema).not.toHaveProperty('sections')
  })
  it('invitations has document columns', () => {
    const cols = Object.keys((schema.invitations as any))
    expect(cols).toEqual(expect.arrayContaining(['draftDocument', 'publishedDocument', 'publishedAt']))
  })
})

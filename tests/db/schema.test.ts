import { describe, it, expect } from 'vitest'
import * as schema from '../../server/db/schema'

describe('schema', () => {
  it('exports all tables', () => {
    for (const t of ['users', 'themes', 'invitations', 'sections', 'guests', 'rsvps', 'media']) {
      expect(schema, `missing table ${t}`).toHaveProperty(t)
    }
  })
})

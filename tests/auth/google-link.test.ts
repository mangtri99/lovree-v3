import { describe, it, expect } from 'vitest'
import { resolveGoogleUser } from '../../server/utils/google-link'

type Row = { id: string; email: string; googleId: string | null }

function makeDeps(rows: Row[]) {
  const db = [...rows]
  return {
    findByGoogleId: async (gid: string) => db.find(r => r.googleId === gid) ?? null,
    findByEmail: async (email: string) => db.find(r => r.email === email) ?? null,
    linkGoogleId: async (id: string, gid: string) => { db.find(r => r.id === id)!.googleId = gid },
    createUser: async (email: string, gid: string) => { const r = { id: 'new', email, googleId: gid }; db.push(r); return r },
  }
}

describe('resolveGoogleUser', () => {
  it('returns existing user matched by google id', async () => {
    const deps = makeDeps([{ id: 'u1', email: 'a@x.com', googleId: 'g1' }])
    const u = await resolveGoogleUser({ sub: 'g1', email: 'a@x.com' }, deps)
    expect(u.id).toBe('u1')
  })
  it('links google id to an existing email account', async () => {
    const deps = makeDeps([{ id: 'u2', email: 'b@x.com', googleId: null }])
    const u = await resolveGoogleUser({ sub: 'g2', email: 'b@x.com' }, deps)
    expect(u.id).toBe('u2')
    expect(await deps.findByGoogleId('g2')).not.toBeNull()
  })
  it('creates a new user when no match', async () => {
    const deps = makeDeps([])
    const u = await resolveGoogleUser({ sub: 'g3', email: 'c@x.com' }, deps)
    expect(u.id).toBe('new')
  })
})

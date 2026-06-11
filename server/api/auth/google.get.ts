import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { resolveGoogleUser, type LinkDeps } from '../../utils/google-link'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: g }) {
    const db = useDb()
    const deps: LinkDeps = {
      findByGoogleId: async (gid) => (await db.select().from(users).where(eq(users.googleId, gid)).limit(1))[0] ?? null,
      findByEmail: async (email) => (await db.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null,
      linkGoogleId: async (id, gid) => { await db.update(users).set({ googleId: gid }).where(eq(users.id, id)) },
      createUser: async (email, gid, name, picture) => {
        const rows = await db.insert(users).values({ email, googleId: gid, name, avatarUrl: picture }).returning()
        const u = rows[0]!
        return { id: u.id, email: u.email }
      },
    }
    const user = await resolveGoogleUser(
      { sub: g.sub, email: g.email, name: g.name, picture: g.picture }, deps,
    )
    await setUserSession(event, { user: { id: user.id, email: user.email } })
    return sendRedirect(event, '/admin')
  },
  onError(event) { return sendRedirect(event, '/login?error=google') },
})

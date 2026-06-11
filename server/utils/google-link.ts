export interface GoogleProfile { sub: string; email: string; emailVerified?: boolean; name?: string; picture?: string }
export interface LinkDeps {
  findByGoogleId(gid: string): Promise<{ id: string; email: string } | null>
  findByEmail(email: string): Promise<{ id: string; email: string } | null>
  linkGoogleId(id: string, gid: string): Promise<void>
  createUser(email: string, gid: string, name?: string, picture?: string): Promise<{ id: string; email: string }>
}

export async function resolveGoogleUser(profile: GoogleProfile, deps: LinkDeps) {
  const byGoogle = await deps.findByGoogleId(profile.sub)
  if (byGoogle) return byGoogle
  // First-time linking or account creation requires a Google-verified email, so
  // an unverified address can never link to or create an account it doesn't own.
  if (profile.emailVerified === false) throw new Error('google_email_not_verified')
  const byEmail = await deps.findByEmail(profile.email)
  if (byEmail) { await deps.linkGoogleId(byEmail.id, profile.sub); return byEmail }
  return deps.createUser(profile.email, profile.sub, profile.name, profile.picture)
}

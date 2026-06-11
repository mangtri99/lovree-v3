export interface GoogleProfile { sub: string; email: string; name?: string; picture?: string }
export interface LinkDeps {
  findByGoogleId(gid: string): Promise<{ id: string; email: string } | null>
  findByEmail(email: string): Promise<{ id: string; email: string } | null>
  linkGoogleId(id: string, gid: string): Promise<void>
  createUser(email: string, gid: string, name?: string, picture?: string): Promise<{ id: string; email: string }>
}

export async function resolveGoogleUser(profile: GoogleProfile, deps: LinkDeps) {
  const byGoogle = await deps.findByGoogleId(profile.sub)
  if (byGoogle) return byGoogle
  const byEmail = await deps.findByEmail(profile.email)
  if (byEmail) { await deps.linkGoogleId(byEmail.id, profile.sub); return byEmail }
  return deps.createUser(profile.email, profile.sub, profile.name, profile.picture)
}

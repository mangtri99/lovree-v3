import { eq, and } from 'drizzle-orm'
import { useDb } from '../db'
import { invitations, sections, themes, media } from '../db/schema'
import { validateContent, SECTION_TYPES, type SectionType } from '../registry/sections'
import { resolveTokens, tokensToCssVars } from '../theme/tokens'

export interface AssembledSection { type: SectionType; content: any }
export interface AssembledInvitation {
  id: string; slug: string; type: string; status: string; ownerId?: string
  cssVars: Record<string, string>
  sections: AssembledSection[]
}
export type LoadedInvitation = AssembledInvitation & { musicUrl: string | null }

export function assembleInvitation(inv: any, theme: any, sectionRows: any[]): AssembledInvitation {
  const ordered = sectionRows
    .filter((s) => s.enabled)
    .filter((s) => SECTION_TYPES.includes(s.type as SectionType))
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ type: s.type as SectionType, content: validateContent(s.type as SectionType, s.content) }))
  const cssVars = tokensToCssVars(resolveTokens(theme?.tokens ?? {}, inv.tokenOverrides ?? {}))
  return { id: inv.id, slug: inv.slug, type: inv.type, status: inv.status, ownerId: inv.ownerId, cssVars, sections: ordered }
}

export async function loadInvitationBySlug(slug: string): Promise<LoadedInvitation | null> {
  const db = useDb()
  const rows = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1)
  const inv = rows[0]
  if (!inv) return null
  // theme and sections both depend only on `inv` — fetch in parallel to save a round-trip
  const [themeRows, sectionRows] = await Promise.all([
    db.select().from(themes).where(eq(themes.id, inv.themeId)).limit(1),
    db.select().from(sections).where(eq(sections.invitationId, inv.id)),
  ])
  const assembled = assembleInvitation(inv, themeRows[0], sectionRows)

  let musicUrl: string | null = null
  if (inv.musicMediaId) {
    const mediaRows = await db.select().from(media).where(and(eq(media.id, inv.musicMediaId), eq(media.type, 'audio'))).limit(1)
    musicUrl = mediaRows[0]?.url || null
  }
  return { ...assembled, musicUrl }
}

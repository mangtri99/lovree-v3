import { eq } from 'drizzle-orm'
import { useDb } from '../db'
import { invitations, themes, musicTracks } from '../db/schema'
import { validateContent, SECTION_TYPES, type SectionType } from '../registry/sections'
import { resolveTokens, tokensToCssVars } from '../theme/tokens'

export interface AssembledSection { type: SectionType; content: any }
export interface AssembledInvitation {
  id: string; slug: string; type: string; status: string; ownerId?: string
  cssVars: Record<string, string>
  sections: AssembledSection[]
  themeKey: string
  seo: { title: string; description: string; ogImage: { mediaId: string; url: string } }
}
export type LoadedInvitation = AssembledInvitation & { musicUrl: string | null; publishedAt: Date | null }

export function assembleInvitation(inv: any, theme: any, sections: any[]): AssembledInvitation {
  const ordered = (Array.isArray(sections) ? sections : [])
    .filter((s) => s.enabled !== false)
    .filter((s) => SECTION_TYPES.includes(s.type as SectionType))
    .map((s) => ({ type: s.type as SectionType, content: validateContent(s.type as SectionType, s.content) }))
  const cssVars = tokensToCssVars(resolveTokens(theme?.tokens ?? {}, inv.tokenOverrides ?? {}))
  return {
    id: inv.id,
    slug: inv.slug,
    type: inv.type,
    status: inv.status,
    ownerId: inv.ownerId,
    cssVars,
    sections: ordered,
    themeKey: theme?.key ?? 'base',
    seo: inv.seo ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } },
  }
}

export async function loadInvitationBySlug(slug: string): Promise<LoadedInvitation | null> {
  const db = useDb()
  const rows = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1)
  const inv = rows[0]
  if (!inv) return null
  const doc = (inv.publishedDocument as any) ?? { sections: [] }
  const themeRows = await db.select().from(themes).where(eq(themes.id, inv.themeId)).limit(1)
  const assembled = assembleInvitation(inv, themeRows[0], doc.sections ?? [])

  let musicUrl: string | null = null
  if (inv.musicTrackId) {
    const trackRows = await db.select({ url: musicTracks.url }).from(musicTracks).where(eq(musicTracks.id, inv.musicTrackId)).limit(1)
    musicUrl = trackRows[0]?.url || null
  }
  return { ...assembled, ownerId: inv.ownerId, musicUrl, publishedAt: inv.publishedAt ?? null }
}

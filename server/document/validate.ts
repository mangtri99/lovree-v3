import { nanoid } from 'nanoid'
import { SECTION_TYPES, sectionRegistry, validateContent, type SectionType } from '../registry/sections'
import { sanitizeRichText } from './sanitize-html'
import type { InvitationDocument } from './types'

// Sanitize every field whose registry type is `richtext` (server-only — keeps validateContent pure).
function sanitizeContent(type: SectionType, content: Record<string, any>): Record<string, any> {
  const fields = (sectionRegistry as any)[type]?.fields ?? {}
  let out = content
  for (const [key, def] of Object.entries(fields)) {
    if ((def as any).type === 'richtext' && typeof out[key] === 'string') {
      out = { ...out, [key]: sanitizeRichText(out[key]) }
    }
  }
  return out
}

export function validateDraftDocument(raw: unknown): InvitationDocument {
  const sectionsIn = (raw && typeof raw === 'object' && Array.isArray((raw as any).sections))
    ? (raw as any).sections
    : []
  const sections = sectionsIn
    .filter((s: any) => s && SECTION_TYPES.includes(s.type as SectionType))
    .map((s: any) => ({
      id: typeof s.id === 'string' && s.id ? s.id : nanoid(),
      type: s.type as SectionType,
      enabled: s.enabled !== false,
      content: sanitizeContent(s.type as SectionType, validateContent(s.type as SectionType, s.content)),
    }))
  return { sections }
}

import { nanoid } from 'nanoid'
import { SECTION_TYPES, validateContent, type SectionType } from '../registry/sections'
import type { InvitationDocument } from './types'

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
      content: validateContent(s.type as SectionType, s.content),
    }))
  return { sections }
}

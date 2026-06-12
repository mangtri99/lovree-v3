import { nanoid } from 'nanoid'
import { defaultContent, type SectionType } from './sections'
import type { InvitationDocument } from '../document/types'

// A new invitation is seeded with a sensible starter set per type so the editor is
// never blank — the customer immediately has Hero (name/date), couple, event, etc. to
// fill in, and can add/remove/reorder from there.
const WEDDING: SectionType[] = ['hero', 'opening', 'couple', 'event', 'countdown', 'gallery', 'love_gift', 'closing', 'footer']

export const STARTER_SECTIONS: Record<string, SectionType[]> = {
  wedding: WEDDING,
  wedding_metatah: WEDDING,
  metatah: WEDDING,
  baby_3mo: ['hero', 'opening', 'couple', 'event', 'gallery', 'closing', 'footer'],
  birthday: ['hero', 'opening', 'event', 'countdown', 'gallery', 'closing', 'footer'],
}

export function starterDocument(type: string): InvitationDocument {
  const types = STARTER_SECTIONS[type] ?? WEDDING
  return {
    sections: types.map((t) => ({ id: nanoid(), type: t, enabled: true, content: defaultContent(t) })),
  }
}

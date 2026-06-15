import { nanoid } from 'nanoid'
import { validateContent, type SectionType } from './sections'
import type { InvitationDocument } from '../document/types'

// A new invitation is seeded with a sensible starter set per type so the editor is
// never blank — the right sections plus occasion-appropriate placeholder copy. The
// customer edits freely from there.
export interface StarterConfig {
  sections: SectionType[]
  content?: Partial<Record<SectionType, Record<string, any>>>
}

const FOOTER = 'Terima kasih · Lovree'

const WEDDING_SECTIONS: SectionType[] = ['hero', 'opening', 'couple', 'event', 'countdown', 'gallery', 'love_gift', 'quote', 'closing', 'footer']

export const STARTER_CONFIG: Record<string, StarterConfig> = {
  wedding: {
    sections: WEDDING_SECTIONS,
    content: {
      hero: { title: 'The Wedding Of' },
      opening: {
        greeting: 'Om Swastiastu',
        body: 'Atas asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, dengan penuh suka cita kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada hari bahagia pernikahan kami.',
      },
      closing: { body: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.' },
      footer: { text: FOOTER },
    },
  },
  wedding_metatah: {
    sections: WEDDING_SECTIONS,
    content: {
      hero: { title: 'Pernikahan & Metatah' },
      opening: {
        greeting: 'Om Swastiastu',
        body: 'Dengan penuh suka cita kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada upacara pernikahan dan metatah keluarga kami.',
      },
      closing: { body: 'Atas kehadiran dan doa restu Bapak/Ibu/Saudara/i, kami haturkan terima kasih.' },
      footer: { text: FOOTER },
    },
  },
  metatah: {
    sections: ['hero', 'opening', 'couple', 'event', 'countdown', 'gallery', 'closing', 'footer'],
    content: {
      hero: { title: 'Upacara Metatah' },
      opening: {
        greeting: 'Om Swastiastu',
        body: 'Dengan memohon asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, kami mengundang Bapak/Ibu/Saudara/i pada upacara Metatah (Mepandes) putra/putri kami.',
      },
      closing: { body: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.' },
      footer: { text: FOOTER },
    },
  },
  baby_3mo: {
    sections: ['hero', 'opening', 'couple', 'event', 'gallery', 'closing', 'footer'],
    content: {
      hero: { title: 'Tiga Bulanan' },
      opening: {
        greeting: 'Om Swastiastu',
        body: 'Dengan penuh rasa syukur, kami mengundang Bapak/Ibu/Saudara/i pada upacara tiga bulanan (nelubulanin) putra/putri kami.',
      },
      closing: { body: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.' },
      footer: { text: FOOTER },
    },
  },
  birthday: {
    sections: ['hero', 'opening', 'event', 'countdown', 'gallery', 'closing', 'footer'],
    content: {
      hero: { title: 'Ulang Tahun' },
      opening: {
        greeting: 'Halo!',
        body: 'Dengan senang hati kami mengundang kamu untuk merayakan hari ulang tahun bersama kami.',
      },
      closing: { body: 'Kehadiranmu adalah hadiah terbaik. Sampai jumpa di hari spesial nanti!' },
      footer: { text: FOOTER },
    },
  },
}

// Back-compat: type -> section list (derived from the config).
export const STARTER_SECTIONS: Record<string, SectionType[]> = Object.fromEntries(
  Object.entries(STARTER_CONFIG).map(([type, cfg]) => [type, cfg.sections]),
)

export interface InvitationWordContent {
  openingGreeting?: string; openingBody?: string
  closingGreeting?: string; closingBody?: string
  quote?: string; quoteSource?: string
}

export function wordToContent(word: InvitationWordContent): Partial<Record<SectionType, Record<string, any>>> {
  const opening: Record<string, any> = {}
  if (word.openingGreeting) opening.greeting = word.openingGreeting
  if (word.openingBody) opening.body = word.openingBody
  const closing: Record<string, any> = {}
  if (word.closingGreeting) closing.greeting = word.closingGreeting
  if (word.closingBody) closing.body = word.closingBody
  const quote: Record<string, any> = {}
  if (word.quote) quote.text = word.quote
  if (word.quoteSource) quote.source = word.quoteSource
  return { opening, closing, quote }
}

export function starterDocument(type: string, word?: InvitationWordContent | null): InvitationDocument {
  const cfg = STARTER_CONFIG[type] ?? STARTER_CONFIG.wedding!
  const wo = word ? wordToContent(word) : {}
  return {
    sections: cfg.sections.map((t) => ({
      id: nanoid(),
      type: t,
      enabled: true,
      // validateContent fills schema defaults for every field, then the per-type
      // override sets the occasion-appropriate text — always schema-valid.
      content: validateContent(t, { ...(cfg.content?.[t] ?? {}), ...((wo as any)[t] ?? {}) }),
    })),
  }
}

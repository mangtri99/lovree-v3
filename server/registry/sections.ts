import { z } from 'zod'
import { galleryItem, youtubeId } from './field-types'

const heroSchema = z.object({
  title: z.string().default(''),
  coupleName: z.string().default(''),
  date: z.string().default(''),
})
const openingSchema = z.object({
  greeting: z.string().default(''),
  body: z.string().default(''),
})
const personSchema = z.object({
  name: z.string().default(''),
  parents: z.string().default(''),
  childOrder: z.string().default(''),
  address: z.string().default(''),
  instagram: z.string().default(''),
  photoMediaId: z.string().uuid().nullable().default(null),
})
const coupleSchema = z.object({
  people: z.array(personSchema).default([]),
})
const eventItemSchema = z.object({
  name: z.string().default(''),
  date: z.string().default(''),
  timeStart: z.string().default(''),
  timeEnd: z.string().default(''),
  venue: z.string().default(''),
  mapsUrl: z.string().default(''),
})
const eventSchema = z.object({ events: z.array(eventItemSchema).default([]) })
const countdownSchema = z.object({ targetDate: z.string().default('') })
const quoteSchema = z.object({ text: z.string().default(''), source: z.string().default('') })
const bankSchema = z.object({
  bank: z.string().default(''),
  number: z.string().default(''),
  holder: z.string().default(''),
})
const loveGiftSchema = z.object({
  note: z.string().default(''),
  banks: z.array(bankSchema).default([]),
})
const gallerySchema = z.object({ items: z.array(galleryItem).default([]) })
const closingSchema = z.object({ body: z.string().default('') })
const socialLinkSchema = z.object({ label: z.string().default(''), url: z.string().default('') })
const infoSchema = z.object({
  phone: z.string().default(''),
  socials: z.array(socialLinkSchema).default([]),
})
const rsvpSchema = z.object({ title: z.string().default('Konfirmasi Kehadiran & Doa') })
const guestbookSchema = z.object({ title: z.string().default('Ucapan & Doa') })
const footerSchema = z.object({ text: z.string().default('') })

export const sectionRegistry = {
  hero: { schema: heroSchema, label: 'Hero' },
  opening: { schema: openingSchema, label: 'Salam Pembuka' },
  couple: { schema: coupleSchema, label: 'Pasangan' },
  event: { schema: eventSchema, label: 'Detail Acara' },
  countdown: { schema: countdownSchema, label: 'Countdown' },
  quote: { schema: quoteSchema, label: 'Quote' },
  love_gift: { schema: loveGiftSchema, label: 'Love Gift' },
  gallery: { schema: gallerySchema, label: 'Galeri' },
  closing: { schema: closingSchema, label: 'Salam Penutup' },
  info: { schema: infoSchema, label: 'Info Lebih Lanjut' },
  rsvp: { schema: rsvpSchema, label: 'Form Ucapan & Doa' },
  guestbook: { schema: guestbookSchema, label: 'Daftar Tamu' },
  footer: { schema: footerSchema, label: 'Footer' },
} as const

export type SectionType = keyof typeof sectionRegistry
export const SECTION_TYPES = Object.keys(sectionRegistry) as SectionType[]

// Validate a content blob against its type's schema. On failure, return schema
// defaults so a malformed blob never crashes the renderer.
export function validateContent<T extends SectionType>(type: T, raw: unknown) {
  const schema = sectionRegistry[type].schema
  const result = schema.safeParse(raw ?? {})
  if (result.success) return result.data
  return schema.parse({}) // all fields have defaults
}

export function defaultContent(type: SectionType) {
  return sectionRegistry[type].schema.parse({})
}

import { z } from 'zod'
import { galleryItems } from './field-types'

export type FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list'
export interface FieldDescriptor {
  type: FieldType
  label: string
  itemFields?: Record<string, FieldDescriptor>
}

const safeUrl = z.string().refine((v) => v === '' || /^https?:\/\//i.test(v), 'must be an http(s) URL').default('')

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
  mapsUrl: safeUrl,
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
const gallerySchema = z.object({ items: galleryItems })
const closingSchema = z.object({ body: z.string().default('') })
const socialLinkSchema = z.object({ label: z.string().default(''), url: safeUrl })
const infoSchema = z.object({
  phone: z.string().default(''),
  socials: z.array(socialLinkSchema).default([]),
})
const rsvpSchema = z.object({ title: z.string().default('Konfirmasi Kehadiran & Doa') })
const guestbookSchema = z.object({ title: z.string().default('Ucapan & Doa') })
const footerSchema = z.object({ text: z.string().default('') })

export const sectionRegistry = {
  hero: {
    schema: heroSchema,
    label: 'Hero',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      coupleName: { type: 'text' as const, label: 'Nama Pasangan' },
      date: { type: 'date' as const, label: 'Tanggal' },
    },
  },
  opening: {
    schema: openingSchema,
    label: 'Salam Pembuka',
    fields: {
      greeting: { type: 'text' as const, label: 'Salam' },
      body: { type: 'longtext' as const, label: 'Isi' },
    },
  },
  couple: {
    schema: coupleSchema,
    label: 'Pasangan',
    fields: {
      people: {
        type: 'list' as const,
        label: 'Pasangan',
        itemFields: {
          name: { type: 'text' as const, label: 'Nama' },
          parents: { type: 'longtext' as const, label: 'Orang Tua' },
          childOrder: { type: 'text' as const, label: 'Anak ke-' },
          address: { type: 'text' as const, label: 'Alamat' },
          instagram: { type: 'text' as const, label: 'Instagram' },
          photoMediaId: { type: 'image' as const, label: 'Foto' },
        },
      },
    },
  },
  event: {
    schema: eventSchema,
    label: 'Detail Acara',
    fields: {
      events: {
        type: 'list' as const,
        label: 'Acara',
        itemFields: {
          name: { type: 'text' as const, label: 'Nama Acara' },
          date: { type: 'date' as const, label: 'Tanggal' },
          timeStart: { type: 'text' as const, label: 'Mulai' },
          timeEnd: { type: 'text' as const, label: 'Selesai' },
          venue: { type: 'text' as const, label: 'Tempat' },
          mapsUrl: { type: 'url' as const, label: 'Google Maps' },
        },
      },
    },
  },
  countdown: {
    schema: countdownSchema,
    label: 'Countdown',
    fields: {
      targetDate: { type: 'date' as const, label: 'Tanggal Tujuan' },
    },
  },
  quote: {
    schema: quoteSchema,
    label: 'Quote',
    fields: {
      text: { type: 'longtext' as const, label: 'Kutipan' },
      source: { type: 'text' as const, label: 'Sumber' },
    },
  },
  love_gift: {
    schema: loveGiftSchema,
    label: 'Love Gift',
    fields: {
      note: { type: 'longtext' as const, label: 'Catatan' },
      banks: {
        type: 'list' as const,
        label: 'Rekening',
        itemFields: {
          bank: { type: 'text' as const, label: 'Bank' },
          number: { type: 'text' as const, label: 'No. Rekening' },
          holder: { type: 'text' as const, label: 'Atas Nama' },
        },
      },
    },
  },
  gallery: {
    schema: gallerySchema,
    label: 'Galeri',
    fields: {
      items: {
        type: 'list' as const,
        label: 'Galeri',
        itemFields: {
          type: { type: 'text' as const, label: 'Tipe (image/youtube)' },
          mediaId: { type: 'image' as const, label: 'Gambar' },
          videoId: { type: 'youtube' as const, label: 'YouTube ID' },
        },
      },
    },
  },
  closing: {
    schema: closingSchema,
    label: 'Salam Penutup',
    fields: {
      body: { type: 'longtext' as const, label: 'Isi' },
    },
  },
  info: {
    schema: infoSchema,
    label: 'Info Lebih Lanjut',
    fields: {
      phone: { type: 'text' as const, label: 'No. Telepon' },
      socials: {
        type: 'list' as const,
        label: 'Sosial Media',
        itemFields: {
          label: { type: 'text' as const, label: 'Label' },
          url: { type: 'url' as const, label: 'URL' },
        },
      },
    },
  },
  rsvp: {
    schema: rsvpSchema,
    label: 'Form Ucapan & Doa',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
    },
  },
  guestbook: {
    schema: guestbookSchema,
    label: 'Daftar Tamu',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
    },
  },
  footer: {
    schema: footerSchema,
    label: 'Footer',
    fields: {
      text: { type: 'text' as const, label: 'Teks Footer' },
    },
  },
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

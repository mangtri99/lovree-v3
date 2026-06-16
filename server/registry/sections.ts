import { z } from 'zod'
import { galleryImages } from './field-types'

export type FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list' | 'gallery' | 'dateformat' | 'richtext'
export interface FieldDescriptor {
  type: FieldType
  label: string
  defaultItem?: Record<string, unknown>
  itemFields?: Record<string, FieldDescriptor>
}

const safeUrl = z.string().refine((v) => v === '' || /^https?:\/\//i.test(v), 'must be an http(s) URL').default('')

const heroSchema = z.object({
  title: z.string().default(''),
  coupleName: z.string().default(''),
  date: z.string().default(''),
  dateFormat: z.string().default('DD MMMM YYYY'),
  backgroundImage: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' }),
})

const heroSlideshowSchema = z.object({
  title: z.string().default(''),
  coupleName: z.string().default(''),
  date: z.string().default(''),
  dateFormat: z.string().default('DD MMMM YYYY'),
  images: galleryImages,
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
  photo: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' }),
})
const coupleSchema = z.object({
  people: z.array(personSchema).default([]),
})
const memberPersonSchema = z.object({
  name: z.string().default(''),
  instagram: z.string().default(''),
  photo: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' }),
})
const memberGroupSchema = z.object({
  peoples: z.array(memberPersonSchema).default([]),
  parents: z.string().default(''),
  childOrder: z.string().default(''),
})
const memberSchema = z.object({ members: z.array(memberGroupSchema).default([]) })
const eventItemSchema = z.object({
  name: z.string().default(''),
  date: z.string().default(''),
  dateFormat: z.string().default('DD MMMM YYYY'),
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
const gallerySchema = z.object({ items: galleryImages })
const videoItem = z.object({ videoId: z.string().default('') })
const videoSchema = z.object({ videos: z.array(videoItem).default([]) })
const closingSchema = z.object({ greeting: z.string().default(''), body: z.string().default('') })
const socialLinkSchema = z.object({ label: z.string().default(''), url: safeUrl })
const infoSchema = z.object({
  phone: z.string().default(''),
  socials: z.array(socialLinkSchema).default([]),
})
const rsvpSchema = z.object({ title: z.string().default('Konfirmasi Kehadiran & Doa') })
const guestbookSchema = z.object({ title: z.string().default('Ucapan & Doa') })
const footerSchema = z.object({ text: z.string().default('') })
const customItemSchema = z.object({
  label: z.string().default(''),
  value: z.string().default(''),
})
const customSchema = z.object({
  title: z.string().default(''),
  items: z.array(customItemSchema).default([]),
})

export const sectionRegistry = {
  hero: {
    schema: heroSchema,
    label: 'Hero',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      coupleName: { type: 'text' as const, label: 'Nama Pasangan' },
      date: { type: 'date' as const, label: 'Tanggal' },
      dateFormat: { type: 'dateformat' as const, label: 'Format Tanggal' },
      backgroundImage: { type: 'image' as const, label: 'Foto Background' },
    },
  },
  hero_slideshow: {
    schema: heroSlideshowSchema,
    label: 'Hero Slideshow',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      coupleName: { type: 'text' as const, label: 'Nama Pasangan' },
      date: { type: 'date' as const, label: 'Tanggal' },
      dateFormat: { type: 'dateformat' as const, label: 'Format Tanggal' },
      images: { type: 'gallery' as const, label: 'Foto' },
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
          photo: { type: 'image' as const, label: 'Foto' },
        },
      },
    },
  },
  member: {
    schema: memberSchema,
    label: 'Peserta',
    fields: {
      members: {
        type: 'list' as const,
        label: 'Grup Peserta',
        defaultItem: { peoples: [], parents: '', childOrder: '' },
        itemFields: {
          parents: { type: 'text' as const, label: 'Orang Tua' },
          childOrder: { type: 'text' as const, label: 'Anak ke-' },
          peoples: {
            type: 'list' as const,
            label: 'Peserta',
            defaultItem: { name: '', instagram: '', photo: { mediaId: '', url: '' } },
            itemFields: {
              name: { type: 'text' as const, label: 'Nama' },
              instagram: { type: 'text' as const, label: 'Instagram' },
              photo: { type: 'image' as const, label: 'Foto' },
            },
          },
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
          dateFormat: { type: 'dateformat' as const, label: 'Format Tanggal' },
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
      items: { type: 'gallery' as const, label: 'Foto' },
    },
  },
  video: {
    schema: videoSchema,
    label: 'Video',
    fields: {
      videos: {
        type: 'list' as const,
        label: 'Video',
        defaultItem: { videoId: '' },
        itemFields: { videoId: { type: 'youtube' as const, label: 'YouTube ID' } },
      },
    },
  },
  closing: {
    schema: closingSchema,
    label: 'Salam Penutup',
    fields: {
      greeting: { type: 'text' as const, label: 'Salam' },
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
  custom: {
    schema: customSchema,
    label: 'Informasi Tambahan',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      items: {
        type: 'list' as const,
        label: 'Baris',
        defaultItem: { label: '', value: '' },
        itemFields: {
          label: { type: 'text' as const, label: 'Label' },
          value: { type: 'longtext' as const, label: 'Isi' },
        },
      },
    },
  },
  footer: {
    schema: footerSchema,
    label: 'Footer',
    fields: {
      text: { type: 'richtext' as const, label: 'Teks Footer' },
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

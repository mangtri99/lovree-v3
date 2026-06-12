import { z } from 'zod'

// A YouTube video id is 11 chars of [A-Za-z0-9_-]
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'invalid YouTube id')

export const mediaImageItem = z.object({ type: z.literal('image'), mediaId: z.string().uuid() })
export const mediaYoutubeItem = z.object({ type: z.literal('youtube'), videoId: youtubeId })
export const galleryItem = z.discriminatedUnion('type', [mediaImageItem, mediaYoutubeItem])

// Document-stored gallery items are lenient so in-progress edits are never dropped.
export const galleryImageItem = z.object({
  type: z.literal('image'),
  mediaId: z.string().default(''),
  url: z.string().default(''),
})
export const galleryYoutubeItem = z.object({
  type: z.literal('youtube'),
  videoId: z.string().default(''),
})
// Resilient: a bad item becomes undefined and is filtered out; the section survives.
export const galleryItems = z
  .array(z.union([galleryImageItem, galleryYoutubeItem]).catch(undefined as any))
  .transform((a) => a.filter(Boolean))
  .default([])

// id -> zod primitive, used to describe generic field kinds in the registry/editor
export const fieldTypes = {
  text: z.string(),
  longtext: z.string(),
  image: z.object({ mediaId: z.string().default(''), url: z.string().default('') }),
  date: z.string(), // ISO date string
  list: z.array(z.unknown()),
  url: z.string().url(),
  youtube: youtubeId,
} as const

export type FieldTypeId = keyof typeof fieldTypes

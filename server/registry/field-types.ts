import { z } from 'zod'

// A YouTube video id is 11 chars of [A-Za-z0-9_-]
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'invalid YouTube id')

export const mediaImageItem = z.object({ type: z.literal('image'), mediaId: z.string().uuid() })
export const mediaYoutubeItem = z.object({ type: z.literal('youtube'), videoId: youtubeId })
export const galleryItem = z.discriminatedUnion('type', [mediaImageItem, mediaYoutubeItem])

// id -> zod primitive, used to describe generic field kinds in the registry/editor
export const fieldTypes = {
  text: z.string(),
  longtext: z.string(),
  image: z.string().uuid(), // media id
  date: z.string(), // ISO date string
  list: z.array(z.unknown()),
  url: z.string().url(),
  youtube: youtubeId,
} as const

export type FieldTypeId = keyof typeof fieldTypes

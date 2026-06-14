import { nanoid } from 'nanoid'
import { useDb } from '../../../db'
import { musicTracks } from '../../../db/schema'
import { validateMediaUpload } from '../../../utils/media-validate'
import { createR2Adapter } from '../../../storage/r2'

const MAX_BODY_BYTES = 6 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const contentLength = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) throw createError({ statusCode: 413, message: 'Payload too large' })

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, message: 'Expected multipart form data' })
  const get = (name: string) => parts.find((p) => p.name === name)
  const file = get('file')
  const name = get('name')?.data?.toString()?.trim() || file?.filename || 'Tanpa Judul'
  if (!file?.data) throw createError({ statusCode: 400, message: 'Missing file' })

  const result = validateMediaUpload({ kind: 'audio', size: file.data.length, bytes: file.data })
  if (!result.ok) throw createError({ statusCode: 400, message: result.error })

  const cfg = useRuntimeConfig().r2 as any
  const adapter = createR2Adapter({
    accountId: cfg.accountId, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey,
    bucket: cfg.bucket, publicUrl: cfg.publicUrl,
  })
  const key = `music/${ownerId}/${nanoid()}.${result.ext}`
  const { url } = await adapter.put(key, file.data, result.contentType)

  const db = useDb()
  const [row] = await db.insert(musicTracks).values({ ownerId, name, r2Key: key, url })
    .returning({ id: musicTracks.id, name: musicTracks.name, url: musicTracks.url })
  return row
})

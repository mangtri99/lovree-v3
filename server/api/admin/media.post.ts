import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from '../../db'
import { invitations, media } from '../../db/schema'
import { assertOwnerOr404 } from '../../utils/ownership'
import { validateMediaUpload, type MediaKind } from '../../utils/media-validate'
import { createR2Adapter } from '../../storage/r2'

// Hard cap before buffering the body: the largest per-kind limit (audio 5MB)
// plus a small allowance for multipart framing. The precise per-kind check
// (validateMediaUpload) still runs after, on the actual file bytes.
const MAX_BODY_BYTES = 6 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null

  // Reject oversized uploads BEFORE reading/buffering the whole body.
  const contentLength = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) throw createError({ statusCode: 413, message: 'Payload too large' })

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, message: 'Expected multipart form data' })

  const get = (name: string) => parts.find((p) => p.name === name)
  const invId = get('invitationId')?.data?.toString()
  const kind = get('kind')?.data?.toString() as MediaKind | undefined
  const file = get('file')
  if (!invId || (kind !== 'image' && kind !== 'audio') || !file?.data) {
    throw createError({ statusCode: 400, message: 'Missing invitationId, kind, or file' })
  }

  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, invId)).limit(1)
  assertOwnerOr404(inv ?? null, viewerId)

  const result = validateMediaUpload({ kind, size: file.data.length, bytes: file.data })
  if (!result.ok) throw createError({ statusCode: 400, message: result.error })

  const cfg = useRuntimeConfig().r2 as any
  const adapter = createR2Adapter({
    accountId: cfg.accountId, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey,
    bucket: cfg.bucket, publicUrl: cfg.publicUrl,
  })
  const key = `invitations/${invId}/${kind}/${nanoid()}.${result.ext}`
  const { url } = await adapter.put(key, file.data, result.contentType)
  const [row] = await db.insert(media).values({ invitationId: invId, type: kind, r2Key: key, url, meta: {} }).returning({ id: media.id, url: media.url })
  return row
})

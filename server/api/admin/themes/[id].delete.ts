import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { themes, invitations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const [theme] = await db.select({ id: themes.id, builtin: themes.builtin }).from(themes).where(eq(themes.id, id)).limit(1)
  if (!theme) throw createError({ statusCode: 404, message: 'Tema tidak ditemukan' })
  if (theme.builtin) throw createError({ statusCode: 403, message: 'Tema bawaan tidak bisa dihapus' })
  const [used] = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.themeId, id)).limit(1)
  if (used) throw createError({ statusCode: 409, message: 'Tema sedang dipakai undangan' })
  await db.delete(themes).where(eq(themes.id, id))
  return { ok: true }
})

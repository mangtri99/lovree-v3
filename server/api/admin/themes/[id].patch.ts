import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { themes } from '../../../db/schema'
import { validateThemeInput } from '../../../theme/validate-theme'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const [theme] = await db.select({ id: themes.id, builtin: themes.builtin }).from(themes).where(eq(themes.id, id)).limit(1)
  if (!theme) throw createError({ statusCode: 404, message: 'Tema tidak ditemukan' })
  if (theme.builtin) throw createError({ statusCode: 403, message: 'Tema bawaan tidak bisa diubah' })
  const v = validateThemeInput(await readBody(event))
  if (!v.ok) throw createError({ statusCode: 400, message: v.error })
  await db.update(themes).set({ name: v.value.name, key: v.value.key, tokens: v.value.tokens }).where(eq(themes.id, id))
  return { ok: true, id, name: v.value.name, key: v.value.key, tokens: v.value.tokens }
})

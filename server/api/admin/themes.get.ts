import { useDb } from '../../db'
import { themes } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  return await db.select({ id: themes.id, name: themes.name, tokens: themes.tokens, previewImage: themes.previewImage, key: themes.key }).from(themes)
})

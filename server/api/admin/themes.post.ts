import { useDb } from '../../db'
import { themes } from '../../db/schema'
import { validateThemeInput } from '../../theme/validate-theme'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const v = validateThemeInput(await readBody(event))
  if (!v.ok) throw createError({ statusCode: 400, message: v.error })
  const db = useDb()
  const [row] = await db.insert(themes)
    .values({ name: v.value.name, key: v.value.key, tokens: v.value.tokens, previewImage: null, builtin: false })
    .returning({ id: themes.id, name: themes.name, key: themes.key, tokens: themes.tokens, builtin: themes.builtin })
  return row
})

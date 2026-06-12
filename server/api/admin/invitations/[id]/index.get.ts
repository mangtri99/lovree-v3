import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, themes } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { resolveTokens, tokensToCssVars } from '../../../../theme/tokens'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const [theme] = await db.select().from(themes).where(eq(themes.id, inv!.themeId)).limit(1)
  const cssVars = tokensToCssVars(resolveTokens((theme?.tokens as any) ?? {}, (inv!.tokenOverrides as any) ?? {}))
  return {
    id: inv!.id, slug: inv!.slug, type: inv!.type, status: inv!.status,
    themeId: inv!.themeId, draftDocument: inv!.draftDocument,
    publishedAt: inv!.publishedAt, cssVars,
  }
})

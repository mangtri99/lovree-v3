import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { useDb } from './index'
import { themes } from './schema'
import { CURATED_THEMES } from '../theme/curated-themes'

// Idempotent: inserts each curated theme only if a theme with that name is absent.
// Safe to run against an existing DB without wiping data.
async function main() {
  const db = useDb()
  for (const t of CURATED_THEMES) {
    const [existing] = await db.select({ id: themes.id }).from(themes).where(eq(themes.name, t.name)).limit(1)
    if (existing) { console.log(`skip (exists): ${t.name}`); continue }
    await db.insert(themes).values({ name: t.name, key: t.key ?? 'base', tokens: t.tokens, previewImage: null, builtin: true })
    console.log(`added: ${t.name}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { useDb } from './index'

// Destructive: drops the drizzle migration-tracking schema AND the public schema
// (all app tables + data), then recreates an empty public schema. Intended for the
// disposable dev DB. The `db:reset` script chains this with db:migrate + db:seed.
async function main() {
  const db = useDb()
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`)
  await db.execute(sql`CREATE SCHEMA public`)
  console.log('DB reset: dropped drizzle + public, recreated public')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

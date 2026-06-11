import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { hashPassword } from '../../utils/password'

const body = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() })

export default defineEventHandler(async (event) => {
  const { email, password, name } = body.parse(await readBody(event))
  const db = useDb()
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing.length) throw createError({ statusCode: 409, message: 'Email already registered' })
  const rows = await db.insert(users).values({ email, passwordHash: await hashPassword(password), name }).returning()
  const user = rows[0]
  if (!user) throw createError({ statusCode: 500, message: 'Failed to create user' })
  await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  return { id: user.id, email: user.email }
})

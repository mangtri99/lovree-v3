import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { verifyPassword } from '../../utils/password'

const body = z.object({ email: z.string().email(), password: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { email, password } = parsed.data
  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !user.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }
  await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  return { id: user.id, email: user.email }
})

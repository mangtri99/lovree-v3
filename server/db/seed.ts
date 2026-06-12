import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from './index'
import { users, themes, invitations, guests, media } from './schema'
import { hashUserPassword } from '../utils/password'
import { SECTION_TYPES, defaultContent } from '../registry/sections'

function seedContent(type: string, base: any) {
  if (type === 'hero') return { ...base, title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' }
  if (type === 'countdown') return { ...base, targetDate: '2026-09-01T08:00:00' }
  if (type === 'quote') return { ...base, text: 'Cinta sejati tidak pernah berakhir.', source: 'QS Ar-Rum: 21' }
  return base
}

async function main() {
  const db = useDb()
  const [owner] = await db.insert(users).values({
    email: 'demo@lovree.com', passwordHash: await hashUserPassword('password123'), name: 'Demo Owner',
  }).returning()
  const [theme] = await db.insert(themes).values({
    name: 'Radiant Love',
    tokens: { color: { primary: '#8b5e3c', secondary: '#c8a97e' }, font: { heading: 'Cormorant Garamond', body: 'Poppins' } },
    previewImage: null,
  }).returning()

  const doc = {
    sections: SECTION_TYPES.map((type) => ({
      id: nanoid(), type, enabled: true, content: seedContent(type, defaultContent(type)),
    })),
  }

  const [inv] = await db.insert(invitations).values({
    ownerId: owner!.id, slug: 'demo-wedding', type: 'wedding', themeId: theme!.id,
    status: 'published', tokenOverrides: {},
    draftDocument: doc, publishedDocument: doc, publishedAt: new Date(),
  }).returning()

  const [song] = await db.insert(media).values({
    invitationId: inv!.id, type: 'audio', r2Key: 'audio/demo.mp3',
    url: 'https://media.lovree.com/audio/demo.mp3', meta: {},
  }).returning()
  await db.update(invitations).set({ musicMediaId: song!.id }).where(eq(invitations.id, inv!.id))

  await db.insert(guests).values({ invitationId: inv!.id, name: 'Budi Santoso', code: 'budi' })
  console.log('Seeded invitation: /u/demo-wedding')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

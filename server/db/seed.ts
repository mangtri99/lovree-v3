import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { useDb } from './index'
import { users, themes, invitations, sections, guests, media } from './schema'
import { hashPassword } from '../utils/password'
import { SECTION_TYPES, defaultContent } from '../registry/sections'
import type { SectionType } from '../registry/sections'

async function main() {
  const db = useDb()

  const rows0 = await db.insert(users).values({
    email: 'demo@lovree.com', passwordHash: await hashPassword('password123'), name: 'Demo Owner',
  }).returning()
  const owner = rows0[0]!

  const rows1 = await db.insert(themes).values({
    name: 'Radiant Love',
    tokens: { color: { primary: '#8b5e3c', secondary: '#c8a97e' }, font: { heading: 'Cormorant Garamond', body: 'Poppins' } },
    previewImage: null,
  }).returning()
  const theme = rows1[0]!

  const rows2 = await db.insert(invitations).values({
    ownerId: owner.id, slug: 'demo-wedding', type: 'wedding', themeId: theme.id,
    status: 'published', tokenOverrides: {},
  }).returning()
  const inv = rows2[0]!

  const rows3 = await db.insert(media).values({
    invitationId: inv.id, type: 'audio', r2Key: 'audio/demo.mp3',
    url: 'https://media.lovree.com/audio/demo.mp3', meta: {},
  }).returning()
  const song = rows3[0]!
  await db.update(invitations).set({ musicMediaId: song.id }).where(eq(invitations.id, inv.id))

  await db.insert(sections).values(SECTION_TYPES.map((type, i) => ({
    invitationId: inv.id, type, position: i, enabled: true, content: seedContent(type, defaultContent(type)),
  })))

  await db.insert(guests).values({ invitationId: inv.id, name: 'Budi Santoso', code: 'budi' })

  console.log('Seeded invitation: /u/demo-wedding')
}

function seedContent(type: SectionType, base: ReturnType<typeof defaultContent>) {
  if (type === 'hero') return { ...base, title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' }
  if (type === 'countdown') return { ...base, targetDate: '2026-09-01T08:00:00' }
  if (type === 'quote') return { ...base, text: 'Cinta sejati tidak pernah berakhir.', source: 'QS Ar-Rum: 21' }
  return base
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

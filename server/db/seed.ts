import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from './index'
import { users, themes, invitations, guests, musicTracks, invitationWords } from './schema'
import { hashUserPassword } from '../utils/password'
import { SECTION_TYPES, defaultContent } from '../registry/sections'
import { CURATED_THEMES } from '../theme/curated-themes'

function seedContent(type: string, base: any) {
  if (type === 'hero') return { ...base, title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' }
  if (type === 'countdown') return { ...base, targetDate: '2026-09-01' }
  if (type === 'quote') return { ...base, text: 'Cinta sejati tidak pernah berakhir.', source: 'QS Ar-Rum: 21' }
  return base
}

async function main() {
  const db = useDb()
  const [owner] = await db.insert(users).values({
    email: 'demo@lovree.com', passwordHash: await hashUserPassword('password123'), name: 'Demo Owner',
  }).returning()
  const insertedThemes = await db.insert(themes)
    .values(CURATED_THEMES.map((t) => ({ name: t.name, key: t.key ?? 'base', tokens: t.tokens, previewImage: null, builtin: true })))
    .returning()
  const theme = insertedThemes[0] // Radiant Love (default/demo)

  const doc = {
    sections: SECTION_TYPES.map((type) => ({
      id: nanoid(), type, enabled: true, content: seedContent(type, defaultContent(type)),
    })),
  }

  await db.insert(invitationWords).values([
    { name: 'Pernikahan — Klasik', type: 'wedding', openingGreeting: 'Om Swastiastu', openingBody: 'Dengan penuh suka cita kami mengundang Bapak/Ibu/Saudara/i pada hari bahagia pernikahan kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.', quote: 'Cinta sejati tidak pernah berakhir.', quoteSource: 'QS Ar-Rum: 21' },
    { name: 'Metatah — Klasik', type: 'metatah', openingGreeting: 'Om Swastiastu', openingBody: 'Kami mengundang Bapak/Ibu/Saudara/i pada upacara Metatah putra/putri kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.', quote: '', quoteSource: '' },
    { name: '3 Bulanan — Klasik', type: 'baby_3mo', openingGreeting: 'Om Swastiastu', openingBody: 'Dengan penuh rasa syukur kami mengundang Bapak/Ibu/Saudara/i pada upacara tiga bulanan putra/putri kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.', quote: '', quoteSource: '' },
    { name: 'Ulang Tahun — Ceria', type: 'birthday', openingGreeting: 'Halo!', openingBody: 'Dengan senang hati kami mengundang kamu untuk merayakan ulang tahun bersama kami.', closingGreeting: 'Sampai jumpa', closingBody: 'Kehadiranmu adalah hadiah terbaik!', quote: '', quoteSource: '' },
    { name: 'Pernikahan + Metatah — Klasik', type: 'wedding_metatah', openingGreeting: 'Om Swastiastu', openingBody: 'Kami mengundang Bapak/Ibu/Saudara/i pada upacara pernikahan dan metatah keluarga kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami haturkan terima kasih.', quote: '', quoteSource: '' },
  ])

  const [inv] = await db.insert(invitations).values({
    ownerId: owner!.id, slug: 'demo-wedding', type: 'wedding', themeId: theme!.id,
    status: 'published', tokenOverrides: {},
    draftDocument: doc, publishedDocument: doc, publishedAt: new Date(),
  }).returning()

  const [song] = await db.insert(musicTracks).values({
    ownerId: owner!.id, name: 'Lagu Demo', r2Key: 'music/demo.mp3',
    url: 'https://media.lovree.com/audio/demo.mp3',
  }).returning()
  await db.update(invitations).set({ musicTrackId: song!.id }).where(eq(invitations.id, inv!.id))

  await db.insert(guests).values({ invitationId: inv!.id, name: 'Budi Santoso', code: 'budi' })
  console.log('Seeded invitation: /u/demo-wedding')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

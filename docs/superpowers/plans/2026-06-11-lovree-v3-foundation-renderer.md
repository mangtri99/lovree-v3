# Lovree v3 — Phase 0 (Foundation) + Phase 1 (Renderer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Nuxt 4 app where an invitation's structure, content, and styling are data (not code), and a published invitation renders at `/u/:slug` with cover + music + read-only section types.

**Architecture:** An invitation is an ordered list of typed section instances. Each section's `type` maps to a code-side registry entry (Zod schema + dumb Vue component); its values live in a JSONB `content` blob validated against that schema. Themes are design-token sets resolved base→theme→override and injected as CSS variables at SSR. Relational tables hold anything queried (users, invitations, sections, guests, rsvps, themes, media); JSONB holds flexible structure/content. No per-customer conditionals, no EAV.

**Tech Stack:** Nuxt 4 (Nitro SSR), Tailwind CSS, Drizzle ORM + Neon Postgres, Cloudflare R2 (S3 SDK), `nuxt-auth-utils` (sessions + Google OAuth), Zod, Vitest + `@nuxt/test-utils` + `@vue/test-utils`, `@nuxt/image`.

Spec: `docs/superpowers/specs/2026-06-11-lovree-v3-foundation-renderer-design.md`

---

## File Structure

```
nuxt.config.ts                      Nuxt config (modules, runtime config)
drizzle.config.ts                   Drizzle Kit config
.env / .env.example                 secrets (DATABASE_URL, R2_*, GOOGLE_*, SESSION_PASSWORD)

server/
  db/
    schema.ts                       Drizzle table definitions (all tables)
    index.ts                        db client (Neon + Drizzle)
    seed.ts                         seed script (theme + invitation + sections + media + guest)
  registry/
    field-types.ts                  generic field type ids + zod primitives
    sections.ts                     sectionRegistry: type -> { schema, component, label, defaultContent }
  theme/
    tokens.ts                       base tokens + resolveTokens(theme, overrides) + tokensToCssVars()
  storage/
    adapter.ts                      StorageAdapter interface
    r2.ts                           R2 implementation
  utils/
    password.ts                     hash/verify (argon2)
    invitation.ts                   loadInvitationBySlug() data loader
  api/
    auth/
      register.post.ts              email/password signup
      login.post.ts                 email/password login
      logout.post.ts                clear session
      google.get.ts                 Google OAuth handler (nuxt-auth-utils)
  middleware/
    admin-guard.ts                  (Nuxt route middleware lives in app/, see below)

app/
  middleware/
    admin.ts                        protect /admin/* (client+server)
  pages/
    admin/index.vue                 placeholder authed dashboard
    login.vue                       login/register form (email/pw + Google button)
    u/[slug].vue                    public renderer entry
  components/
    invitation/
      InvitationRoot.vue            injects CSS vars, orchestrates cover + sections
      CoverModal.vue                full-screen cover, "Buka Undangan", music gate
      MusicPlayer.vue               <audio loop> + mute toggle
      SectionRenderer.vue           maps section.type -> component via registry
      YouTubeEmbed.vue              lite-embed facade
      sections/
        HeroSection.vue
        OpeningSection.vue
        CoupleSection.vue
        EventSection.vue
        CountdownSection.vue
        QuoteSection.vue
        LoveGiftSection.vue
        GallerySection.vue
        ClosingSection.vue
        InfoSection.vue
        RsvpSection.vue             form UI only (submit wired Phase 3)
        GuestbookSection.vue        list UI (live data Phase 3)
        FooterSection.vue

tests/                              Vitest specs mirror server/ and app/components
```

---

# PHASE 0 — FOUNDATION

## Task 1: Initialize Nuxt 4 project + tooling

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `vitest.config.ts`

- [ ] **Step 1: Scaffold Nuxt and install deps**

Run:
```bash
npx nuxi@latest init . --packageManager npm --no-install --force
npm install
npm install drizzle-orm @neondatabase/serverless zod nuxt-auth-utils @aws-sdk/client-s3
npm install -D drizzle-kit vitest @nuxt/test-utils @vue/test-utils happy-dom @types/node
npx nuxi module add @nuxt/image
npx nuxi module add @nuxtjs/tailwindcss
```
Expected: `package.json` lists the deps; `node_modules` populated. `nuxi init` into a non-empty dir needs `--force`; it will not touch existing `docs/`, `BRIEF.md`, `.git`.

- [ ] **Step 2: Configure Nuxt + runtime config + auth-utils module**

Write `nuxt.config.ts`:
```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/image', 'nuxt-auth-utils'],
  compatibilityDate: '2025-01-01',
  nitro: { preset: 'vercel' },
  runtimeConfig: {
    databaseUrl: '',
    r2: { accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '', publicUrl: '' },
    oauth: { google: { clientId: '', clientSecret: '' } },
    session: { password: '' },
    public: {},
  },
})
```
`nuxt-auth-utils` reads `NUXT_SESSION_PASSWORD`, `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` from env automatically; the `runtimeConfig` mirrors keep them typed.

- [ ] **Step 3: Write `.env.example` and `vitest.config.ts`**

`.env.example`:
```
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
NUXT_R2_ACCOUNT_ID=
NUXT_R2_ACCESS_KEY_ID=
NUXT_R2_SECRET_ACCESS_KEY=
NUXT_R2_BUCKET=lovree
NUXT_R2_PUBLIC_URL=https://media.lovree.com
NUXT_SESSION_PASSWORD=at-least-32-characters-long-random
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=
```
`vitest.config.ts`:
```ts
import { defineVitestConfig } from '@nuxt/test-utils/config'
export default defineVitestConfig({
  test: { environment: 'happy-dom' },
})
```
Add to `package.json` scripts: `"test": "vitest run"`, `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:seed": "tsx server/db/seed.ts"`. Install `tsx` as a dev dep (`npm install -D tsx`).

- [ ] **Step 4: Verify the app boots and tests run**

Run: `npm run test` → Expected: "No test files found" (exit 0) or passes with 0 tests.
Run: `npx nuxi typecheck` → Expected: no type errors (may need `npx nuxi prepare` first).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "chore: scaffold Nuxt 4 app with Drizzle, auth-utils, Tailwind, Vitest"
```

---

## Task 2: Database schema (Drizzle)

**Files:**
- Create: `server/db/schema.ts`, `server/db/index.ts`, `drizzle.config.ts`
- Test: `tests/db/schema.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import * as schema from '../../server/db/schema'

describe('schema', () => {
  it('exports all tables', () => {
    for (const t of ['users', 'themes', 'invitations', 'sections', 'guests', 'rsvps', 'media']) {
      expect(schema, `missing table ${t}`).toHaveProperty(t)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: FAIL — cannot resolve `server/db/schema`.

- [ ] **Step 3: Write the schema**

`server/db/schema.ts`:
```ts
import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tokens: jsonb('tokens').notNull(),
  previewImage: text('preview_image'),
})

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(), // wedding | metatah | wedding_metatah | baby_3mo | birthday
  themeId: uuid('theme_id').notNull().references(() => themes.id),
  tokenOverrides: jsonb('token_overrides').notNull().default({}),
  status: text('status').notNull().default('draft'), // draft | published
  musicMediaId: uuid('music_media_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  type: text('type').notNull(),
  position: integer('position').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  content: jsonb('content').notNull().default({}),
  fieldOverrides: jsonb('field_overrides').notNull().default({}),
})

export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  groupLabel: text('group_label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({ uniqCode: unique().on(t.invitationId, t.code) }))

export const rsvps = pgTable('rsvps', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  guestId: uuid('guest_id').references(() => guests.id),
  name: text('name').notNull(),
  attendance: text('attendance'), // yes | no | maybe
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  type: text('type').notNull(), // image | audio (video = YouTube embed, not stored)
  r2Key: text('r2_key').notNull(),
  url: text('url').notNull(),
  meta: jsonb('meta').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

`server/db/index.ts`:
```ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL not set')
    _db = drizzle(neon(url), { schema })
  }
  return _db
}
```

`drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate + apply migration**

Run: `npm run db:generate` → Expected: SQL migration file written under `server/db/migrations/`.
Run: `npm run db:migrate` → Expected: tables created on Neon (requires `DATABASE_URL` in `.env`). If no DB yet, skip migrate but commit the generated SQL.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: add Drizzle schema and db client"
```

---

## Task 3: Generic field types

**Files:**
- Create: `server/registry/field-types.ts`
- Test: `tests/registry/field-types.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/registry/field-types.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { fieldTypes, youtubeId } from '../../server/registry/field-types'

describe('field types', () => {
  it('lists generic types', () => {
    expect(Object.keys(fieldTypes)).toEqual(
      expect.arrayContaining(['text', 'longtext', 'image', 'date', 'list', 'url', 'youtube'])
    )
  })
  it('youtubeId accepts a bare id', () => {
    expect(youtubeId.parse('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('youtubeId rejects garbage', () => {
    expect(() => youtubeId.parse('not a valid id!!')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/field-types.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement**

`server/registry/field-types.ts`:
```ts
import { z } from 'zod'

// A YouTube video id is 11 chars of [A-Za-z0-9_-]
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'invalid YouTube id')

export const mediaImageItem = z.object({ type: z.literal('image'), mediaId: z.string().uuid() })
export const mediaYoutubeItem = z.object({ type: z.literal('youtube'), videoId: youtubeId })
export const galleryItem = z.discriminatedUnion('type', [mediaImageItem, mediaYoutubeItem])

// id -> zod primitive, used to describe generic field kinds in the registry/editor
export const fieldTypes = {
  text: z.string(),
  longtext: z.string(),
  image: z.string().uuid(), // media id
  date: z.string(), // ISO date string
  list: z.array(z.unknown()),
  url: z.string().url(),
  youtube: youtubeId,
} as const

export type FieldTypeId = keyof typeof fieldTypes
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/registry/field-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add generic field types with zod primitives"
```

---

## Task 4: Section registry (schemas + defaults)

The component references are added in Phase 1; this task defines the **schema + label + defaultContent** for every section type so content can be validated server-side now. Component wiring happens in Task 14.

**Files:**
- Create: `server/registry/sections.ts`
- Test: `tests/registry/sections.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/registry/sections.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sectionRegistry, validateContent, SECTION_TYPES } from '../../server/registry/sections'

describe('section registry', () => {
  it('defines all MVP section types', () => {
    expect(SECTION_TYPES).toEqual(expect.arrayContaining([
      'hero','opening','couple','event','countdown','quote',
      'love_gift','gallery','closing','info','rsvp','guestbook','footer',
    ]))
  })

  it('validates hero content and fills defaults for missing fields', () => {
    const out = validateContent('hero', { title: 'Walimah', coupleName: 'Willy & Debby' })
    expect(out.title).toBe('Walimah')
    expect(out.date).toBe('') // default applied
  })

  it('does not throw on a malformed blob; falls back to defaults', () => {
    const out = validateContent('countdown', { targetDate: 12345 })
    expect(out.targetDate).toBe('') // invalid -> default
  })

  it('parses gallery youtube items', () => {
    const out = validateContent('gallery', { items: [{ type: 'youtube', videoId: 'dQw4w9WgXcQ' }] })
    expect(out.items[0]).toEqual({ type: 'youtube', videoId: 'dQw4w9WgXcQ' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement**

`server/registry/sections.ts`:
```ts
import { z } from 'zod'
import { galleryItem, youtubeId } from './field-types'

const heroSchema = z.object({
  title: z.string().default(''),
  coupleName: z.string().default(''),
  date: z.string().default(''),
})
const openingSchema = z.object({
  greeting: z.string().default(''),
  body: z.string().default(''),
})
const personSchema = z.object({
  name: z.string().default(''),
  parents: z.string().default(''),
  childOrder: z.string().default(''),
  address: z.string().default(''),
  instagram: z.string().default(''),
  photoMediaId: z.string().uuid().nullable().default(null),
})
const coupleSchema = z.object({
  people: z.array(personSchema).default([]),
})
const eventItemSchema = z.object({
  name: z.string().default(''),
  date: z.string().default(''),
  timeStart: z.string().default(''),
  timeEnd: z.string().default(''),
  venue: z.string().default(''),
  mapsUrl: z.string().default(''),
})
const eventSchema = z.object({ events: z.array(eventItemSchema).default([]) })
const countdownSchema = z.object({ targetDate: z.string().default('') })
const quoteSchema = z.object({ text: z.string().default(''), source: z.string().default('') })
const bankSchema = z.object({
  bank: z.string().default(''),
  number: z.string().default(''),
  holder: z.string().default(''),
})
const loveGiftSchema = z.object({
  note: z.string().default(''),
  banks: z.array(bankSchema).default([]),
})
const gallerySchema = z.object({ items: z.array(galleryItem).default([]) })
const closingSchema = z.object({ body: z.string().default('') })
const socialLinkSchema = z.object({ label: z.string().default(''), url: z.string().default('') })
const infoSchema = z.object({
  phone: z.string().default(''),
  socials: z.array(socialLinkSchema).default([]),
})
const rsvpSchema = z.object({ title: z.string().default('Konfirmasi Kehadiran & Doa') })
const guestbookSchema = z.object({ title: z.string().default('Ucapan & Doa') })
const footerSchema = z.object({ text: z.string().default('') })

export const sectionRegistry = {
  hero: { schema: heroSchema, label: 'Hero' },
  opening: { schema: openingSchema, label: 'Salam Pembuka' },
  couple: { schema: coupleSchema, label: 'Pasangan' },
  event: { schema: eventSchema, label: 'Detail Acara' },
  countdown: { schema: countdownSchema, label: 'Countdown' },
  quote: { schema: quoteSchema, label: 'Quote' },
  love_gift: { schema: loveGiftSchema, label: 'Love Gift' },
  gallery: { schema: gallerySchema, label: 'Galeri' },
  closing: { schema: closingSchema, label: 'Salam Penutup' },
  info: { schema: infoSchema, label: 'Info Lebih Lanjut' },
  rsvp: { schema: rsvpSchema, label: 'Form Ucapan & Doa' },
  guestbook: { schema: guestbookSchema, label: 'Daftar Tamu' },
  footer: { schema: footerSchema, label: 'Footer' },
} as const

export type SectionType = keyof typeof sectionRegistry
export const SECTION_TYPES = Object.keys(sectionRegistry) as SectionType[]

// Validate a content blob against its type's schema. On failure, return schema
// defaults so a malformed blob never crashes the renderer.
export function validateContent<T extends SectionType>(type: T, raw: unknown) {
  const schema = sectionRegistry[type].schema
  const result = schema.safeParse(raw ?? {})
  if (result.success) return result.data
  return schema.parse({}) // all fields have defaults
}

export function defaultContent(type: SectionType) {
  return sectionRegistry[type].schema.parse({})
}
```

Note: `youtubeId` is imported only to keep the dependency explicit for future video-section use; `galleryItem` already references it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add section registry with per-type zod schemas and safe validation"
```

---

## Task 5: Design-token resolver

**Files:**
- Create: `server/theme/tokens.ts`
- Test: `tests/theme/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/theme/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { baseTokens, resolveTokens, tokensToCssVars, OVERRIDE_WHITELIST } from '../../server/theme/tokens'

describe('tokens', () => {
  it('theme overrides base, invitation overrides theme', () => {
    const theme = { color: { primary: '#8b5e3c' } }
    const overrides = { color: { primary: '#111111' }, font: { heading: 'Cormorant' } }
    const r = resolveTokens(theme, overrides)
    expect(r.color.primary).toBe('#111111')      // invitation wins
    expect(r.font.heading).toBe('Cormorant')      // invitation adds
    expect(r.color.bg).toBe(baseTokens.color.bg)  // base fallback
  })

  it('drops non-whitelisted invitation overrides', () => {
    const r = resolveTokens({}, { radius: { sm: '999px' } as any })
    expect(r.radius.sm).toBe(baseTokens.radius.sm)
    expect(OVERRIDE_WHITELIST).not.toContain('radius.sm')
  })

  it('flattens tokens to css custom properties', () => {
    const vars = tokensToCssVars(resolveTokens({ color: { primary: '#abc' } }, {}))
    expect(vars['--color-primary']).toBe('#abc')
    expect(vars['--font-heading']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme/tokens.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement**

`server/theme/tokens.ts`:
```ts
export interface Tokens {
  color: { primary: string; secondary: string; bg: string; text: string; accent: string }
  font: { heading: string; body: string }
  radius: { sm: string; md: string; lg: string }
  ornament: { motif: string; divider: string }
}

export const baseTokens: Tokens = {
  color: { primary: '#8b5e3c', secondary: '#c8a97e', bg: '#faf6f0', text: '#2e2a26', accent: '#a47148' },
  font: { heading: 'Cormorant Garamond', body: 'Poppins' },
  radius: { sm: '4px', md: '8px', lg: '16px' },
  ornament: { motif: 'none', divider: 'none' },
}

// Dotted paths a customer may override on top of a theme. Everything else locks to the theme.
export const OVERRIDE_WHITELIST = ['color.primary', 'color.secondary', 'font.heading', 'font.body'] as const

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> }

function deepMerge(a: any, b: any) {
  const out: any = Array.isArray(a) ? [...a] : { ...a }
  for (const k of Object.keys(b ?? {})) {
    out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? deepMerge(a?.[k] ?? {}, b[k]) : b[k]
  }
  return out
}

function pickWhitelisted(overrides: any) {
  const out: any = {}
  for (const path of OVERRIDE_WHITELIST) {
    const [group, key] = path.split('.')
    const val = overrides?.[group]?.[key]
    if (val !== undefined) (out[group] ??= {})[key] = val
  }
  return out
}

export function resolveTokens(themeTokens: DeepPartial<Tokens>, invitationOverrides: DeepPartial<Tokens>): Tokens {
  const withTheme = deepMerge(baseTokens, themeTokens ?? {})
  return deepMerge(withTheme, pickWhitelisted(invitationOverrides ?? {}))
}

export function tokensToCssVars(tokens: Tokens): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const group of Object.keys(tokens) as (keyof Tokens)[]) {
    for (const key of Object.keys(tokens[group])) {
      vars[`--${group}-${key}`] = (tokens[group] as any)[key]
    }
  }
  return vars
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add design-token resolver with whitelisted overrides and css-var output"
```

---

## Task 6: Storage adapter + R2 implementation

**Files:**
- Create: `server/storage/adapter.ts`, `server/storage/r2.ts`
- Test: `tests/storage/adapter.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/storage/adapter.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

const send = vi.fn().mockResolvedValue({})
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send })),
  PutObjectCommand: vi.fn((i) => ({ input: i })),
  DeleteObjectCommand: vi.fn((i) => ({ input: i })),
}))

import { createR2Adapter } from '../../server/storage/r2'

describe('r2 adapter', () => {
  const adapter = createR2Adapter({
    accountId: 'acc', accessKeyId: 'k', secretAccessKey: 's',
    bucket: 'lovree', publicUrl: 'https://media.lovree.com',
  })

  it('put returns key + public url and calls S3', async () => {
    const r = await adapter.put('img/a.jpg', Buffer.from('x'), 'image/jpeg')
    expect(r).toEqual({ key: 'img/a.jpg', url: 'https://media.lovree.com/img/a.jpg' })
    expect(send).toHaveBeenCalled()
  })

  it('url builds a public url', () => {
    expect(adapter.url('audio/song.mp3')).toBe('https://media.lovree.com/audio/song.mp3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/adapter.test.ts`
Expected: FAIL — cannot resolve `server/storage/r2`.

- [ ] **Step 3: Implement**

`server/storage/adapter.ts`:
```ts
export interface PutResult { key: string; url: string }

export interface StorageAdapter {
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<PutResult>
  url(key: string): string
  delete(key: string): Promise<void>
}
```

`server/storage/r2.ts`:
```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter } from './adapter'

export interface R2Config {
  accountId: string; accessKeyId: string; secretAccessKey: string
  bucket: string; publicUrl: string
}

export function createR2Adapter(cfg: R2Config): StorageAdapter {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  })
  const url = (key: string) => `${cfg.publicUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
  return {
    url,
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }))
      return { key, url: url(key) }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }))
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage/adapter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add storage adapter interface and R2 implementation"
```

---

## Task 7: Password hashing utility + email/password auth endpoints

**Files:**
- Create: `server/utils/password.ts`, `server/api/auth/register.post.ts`, `server/api/auth/login.post.ts`, `server/api/auth/logout.post.ts`
- Test: `tests/utils/password.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/utils/password.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../server/utils/password'

describe('password', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('s3cret!')
    expect(await verifyPassword(hash, 's3cret!')).toBe(true)
    expect(await verifyPassword(hash, 'wrong')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/password.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement password util**

Install: `npm install @node-rs/argon2`

`server/utils/password.ts`:
```ts
import { hash, verify } from '@node-rs/argon2'

export function hashPassword(plain: string) {
  return hash(plain)
}
export function verifyPassword(stored: string, plain: string) {
  return verify(stored, plain).catch(() => false)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/password.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement auth endpoints**

`server/api/auth/register.post.ts`:
```ts
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
  const [user] = await db.insert(users).values({ email, passwordHash: await hashPassword(password), name }).returning()
  await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  return { id: user.id, email: user.email }
})
```

`server/api/auth/login.post.ts`:
```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { verifyPassword } from '../../utils/password'

const body = z.object({ email: z.string().email(), password: z.string() })

export default defineEventHandler(async (event) => {
  const { email, password } = body.parse(await readBody(event))
  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !user.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }
  await setUserSession(event, { user: { id: user.id, email: user.email, name: user.name } })
  return { id: user.id, email: user.email }
})
```

`server/api/auth/logout.post.ts`:
```ts
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
```

`setUserSession` / `clearUserSession` are auto-imported by `nuxt-auth-utils`.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: add password hashing and email/password auth endpoints"
```

---

## Task 8: Google OAuth login

**Files:**
- Create: `server/api/auth/google.get.ts`
- Test: `tests/auth/google-link.test.ts`

This task tests the **account-linking decision logic** as a pure function (the OAuth handshake itself is provided by `nuxt-auth-utils` and not unit-tested here).

- [ ] **Step 1: Write the failing test**

`tests/auth/google-link.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveGoogleUser } from '../../server/utils/google-link'

type Row = { id: string; email: string; googleId: string | null }

function makeDeps(rows: Row[]) {
  const db = [...rows]
  return {
    findByGoogleId: async (gid: string) => db.find(r => r.googleId === gid) ?? null,
    findByEmail: async (email: string) => db.find(r => r.email === email) ?? null,
    linkGoogleId: async (id: string, gid: string) => { db.find(r => r.id === id)!.googleId = gid },
    createUser: async (email: string, gid: string) => { const r = { id: 'new', email, googleId: gid }; db.push(r); return r },
  }
}

describe('resolveGoogleUser', () => {
  it('returns existing user matched by google id', async () => {
    const deps = makeDeps([{ id: 'u1', email: 'a@x.com', googleId: 'g1' }])
    const u = await resolveGoogleUser({ sub: 'g1', email: 'a@x.com' }, deps)
    expect(u.id).toBe('u1')
  })
  it('links google id to an existing email account', async () => {
    const deps = makeDeps([{ id: 'u2', email: 'b@x.com', googleId: null }])
    const u = await resolveGoogleUser({ sub: 'g2', email: 'b@x.com' }, deps)
    expect(u.id).toBe('u2')
    expect(await deps.findByGoogleId('g2')).not.toBeNull()
  })
  it('creates a new user when no match', async () => {
    const deps = makeDeps([])
    const u = await resolveGoogleUser({ sub: 'g3', email: 'c@x.com' }, deps)
    expect(u.id).toBe('new')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/google-link.test.ts`
Expected: FAIL — cannot resolve `server/utils/google-link`.

- [ ] **Step 3: Implement linking logic + OAuth handler**

`server/utils/google-link.ts`:
```ts
export interface GoogleProfile { sub: string; email: string; name?: string; picture?: string }
export interface LinkDeps {
  findByGoogleId(gid: string): Promise<{ id: string; email: string } | null>
  findByEmail(email: string): Promise<{ id: string; email: string } | null>
  linkGoogleId(id: string, gid: string): Promise<void>
  createUser(email: string, gid: string, name?: string, picture?: string): Promise<{ id: string; email: string }>
}

export async function resolveGoogleUser(profile: GoogleProfile, deps: LinkDeps) {
  const byGoogle = await deps.findByGoogleId(profile.sub)
  if (byGoogle) return byGoogle
  const byEmail = await deps.findByEmail(profile.email)
  if (byEmail) { await deps.linkGoogleId(byEmail.id, profile.sub); return byEmail }
  return deps.createUser(profile.email, profile.sub, profile.name, profile.picture)
}
```

`server/api/auth/google.get.ts`:
```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { resolveGoogleUser, type LinkDeps } from '../../utils/google-link'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: g }) {
    const db = useDb()
    const deps: LinkDeps = {
      findByGoogleId: async (gid) => (await db.select().from(users).where(eq(users.googleId, gid)).limit(1))[0] ?? null,
      findByEmail: async (email) => (await db.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null,
      linkGoogleId: async (id, gid) => { await db.update(users).set({ googleId: gid }).where(eq(users.id, id)) },
      createUser: async (email, gid, name, picture) => {
        const [u] = await db.insert(users).values({ email, googleId: gid, name, avatarUrl: picture }).returning()
        return u
      },
    }
    const user = await resolveGoogleUser(
      { sub: g.sub, email: g.email, name: g.name, picture: g.picture }, deps,
    )
    await setUserSession(event, { user: { id: user.id, email: user.email } })
    return sendRedirect(event, '/admin')
  },
  onError(event) { return sendRedirect(event, '/login?error=google') },
})
```
`defineOAuthGoogleEventHandler` is provided by `nuxt-auth-utils`; it reads `NUXT_OAUTH_GOOGLE_CLIENT_ID/SECRET` from env and the redirect URI is `/api/auth/google`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth/google-link.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add Google OAuth login with account linking"
```

---

## Task 9: Admin route guard + login page + placeholder dashboard

**Files:**
- Create: `app/middleware/admin.ts`, `app/pages/login.vue`, `app/pages/admin/index.vue`

- [ ] **Step 1: Implement the route middleware**

`app/middleware/admin.ts`:
```ts
export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo('/login')
})
```

- [ ] **Step 2: Implement the login page**

`app/pages/login.vue`:
```vue
<script setup lang="ts">
const email = ref('')
const password = ref('')
const mode = ref<'login' | 'register'>('login')
const error = ref('')
const { fetch: refreshSession } = useUserSession()

async function submit() {
  error.value = ''
  try {
    await $fetch(`/api/auth/${mode.value}`, { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal'
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm p-8">
    <h1 class="mb-4 text-xl font-semibold">{{ mode === 'login' ? 'Masuk' : 'Daftar' }}</h1>
    <form class="space-y-3" @submit.prevent="submit">
      <input v-model="email" type="email" placeholder="Email" class="w-full rounded border p-2" required />
      <input v-model="password" type="password" placeholder="Password" class="w-full rounded border p-2" required />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="w-full rounded bg-black p-2 text-white">
        {{ mode === 'login' ? 'Masuk' : 'Daftar' }}
      </button>
    </form>
    <a href="/api/auth/google" class="mt-3 block w-full rounded border p-2 text-center">Masuk dengan Google</a>
    <button class="mt-3 text-sm text-gray-500" @click="mode = mode === 'login' ? 'register' : 'login'">
      {{ mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk' }}
    </button>
  </div>
</template>
```

- [ ] **Step 3: Implement the placeholder dashboard**

`app/pages/admin/index.vue`:
```vue
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
const { user, clear } = useUserSession()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="p-8">
    <h1 class="text-xl font-semibold">Dashboard</h1>
    <p class="mt-2 text-gray-600">Masuk sebagai {{ user?.email }}</p>
    <button class="mt-4 rounded border px-3 py-1" @click="logout">Keluar</button>
  </div>
</template>
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Visit `/admin` → Expected: redirected to `/login`. Register an account → Expected: lands on `/admin` showing the email. Click Keluar → Expected: back to `/login`.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add admin route guard, login/register page, placeholder dashboard"
```

---

## Task 10: Seed script

**Files:**
- Create: `server/db/seed.ts`

- [ ] **Step 1: Write the seed**

`server/db/seed.ts`:
```ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { useDb } from './index'
import { users, themes, invitations, sections, guests, media } from './schema'
import { hashPassword } from '../utils/password'
import { defaultContent } from '../registry/sections'

async function main() {
  const db = useDb()

  const [owner] = await db.insert(users).values({
    email: 'demo@lovree.com', passwordHash: await hashPassword('password123'), name: 'Demo Owner',
  }).returning()

  const [theme] = await db.insert(themes).values({
    name: 'Radiant Love',
    tokens: { color: { primary: '#8b5e3c', secondary: '#c8a97e' }, font: { heading: 'Cormorant Garamond', body: 'Poppins' } },
    previewImage: null,
  }).returning()

  const [inv] = await db.insert(invitations).values({
    ownerId: owner.id, slug: 'demo-wedding', type: 'wedding', themeId: theme.id,
    status: 'published', tokenOverrides: {},
  }).returning()

  const [song] = await db.insert(media).values({
    invitationId: inv.id, type: 'audio', r2Key: 'audio/demo.mp3',
    url: 'https://media.lovree.com/audio/demo.mp3', meta: {},
  }).returning()
  await db.update(invitations).set({ musicMediaId: song.id }).where(eq(invitations.id, inv.id))

  const order = ['hero','opening','couple','event','countdown','quote','love_gift','gallery','closing','info','rsvp','guestbook','footer'] as const
  await db.insert(sections).values(order.map((type, i) => ({
    invitationId: inv.id, type, position: i, enabled: true, content: seedContent(type, defaultContent(type)),
  })))

  await db.insert(guests).values({ invitationId: inv.id, name: 'Budi Santoso', code: 'budi' })

  console.log('Seeded invitation: /u/demo-wedding')
}

function seedContent(type: string, base: any) {
  if (type === 'hero') return { ...base, title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' }
  if (type === 'countdown') return { ...base, targetDate: '2026-09-01T08:00:00' }
  if (type === 'quote') return { ...base, text: 'Cinta sejati tidak pernah berakhir.', source: 'QS Ar-Rum: 21' }
  return base
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```
Install: `npm install -D dotenv`.

- [ ] **Step 2: Run the seed**

Run: `npm run db:seed`
Expected: prints `Seeded invitation: /u/demo-wedding` (requires migrated Neon DB). If no DB available yet, skip running but commit the script.

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "feat: add seed script with demo theme, invitation, sections, guest"
```

---

# PHASE 1 — PUBLIC RENDERER

## Task 11: Invitation data loader

**Files:**
- Create: `server/utils/invitation.ts`
- Test: `tests/utils/invitation.test.ts`

This task implements the pure assembly/validation logic (`assembleInvitation`) and the DB-backed loader. The test covers the pure part.

- [ ] **Step 1: Write the failing test**

`tests/utils/invitation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

describe('assembleInvitation', () => {
  const theme = { tokens: { color: { primary: '#abc' } } }
  const inv = { id: 'i1', slug: 'x', type: 'wedding', status: 'published', tokenOverrides: { color: { primary: '#111' } } }

  it('orders enabled sections by position and drops disabled', () => {
    const rows = [
      { type: 'quote', position: 2, enabled: true, content: {} },
      { type: 'hero', position: 0, enabled: true, content: { title: 'T' } },
      { type: 'gallery', position: 1, enabled: false, content: {} },
    ]
    const out = assembleInvitation(inv as any, theme as any, rows as any)
    expect(out.sections.map(s => s.type)).toEqual(['hero', 'quote'])
  })

  it('validates content and exposes resolved css vars', () => {
    const out = assembleInvitation(inv as any, theme as any, [{ type: 'hero', position: 0, enabled: true, content: { title: 'T' } }] as any)
    expect(out.sections[0].content.title).toBe('T')
    expect(out.sections[0].content.coupleName).toBe('') // default filled
    expect(out.cssVars['--color-primary']).toBe('#111') // override wins
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/invitation.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement**

`server/utils/invitation.ts`:
```ts
import { eq, and } from 'drizzle-orm'
import { useDb } from '../db'
import { invitations, sections, themes, media } from '../db/schema'
import { validateContent, type SectionType } from '../registry/sections'
import { resolveTokens, tokensToCssVars } from '../theme/tokens'

export interface AssembledSection { type: SectionType; content: any }
export interface AssembledInvitation {
  id: string; slug: string; type: string; status: string; ownerId?: string
  cssVars: Record<string, string>
  sections: AssembledSection[]
}

export function assembleInvitation(inv: any, theme: any, sectionRows: any[]): AssembledInvitation {
  const ordered = sectionRows
    .filter((s) => s.enabled)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ type: s.type as SectionType, content: validateContent(s.type, s.content) }))
  const cssVars = tokensToCssVars(resolveTokens(theme?.tokens ?? {}, inv.tokenOverrides ?? {}))
  return { id: inv.id, slug: inv.slug, type: inv.type, status: inv.status, ownerId: inv.ownerId, cssVars, sections: ordered }
}

export async function loadInvitationBySlug(slug: string) {
  const db = useDb()
  const [inv] = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1)
  if (!inv) return null
  const [theme] = await db.select().from(themes).where(eq(themes.id, inv.themeId)).limit(1)
  const sectionRows = await db.select().from(sections).where(eq(sections.invitationId, inv.id))
  const assembled = assembleInvitation(inv, theme, sectionRows)

  let musicUrl: string | null = null
  if (inv.musicMediaId) {
    const [song] = await db.select().from(media).where(and(eq(media.id, inv.musicMediaId), eq(media.type, 'audio'))).limit(1)
    musicUrl = song?.url ?? null
  }
  return { ...assembled, ownerId: inv.ownerId, musicUrl }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/invitation.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add invitation data loader and assembly/validation"
```

---

## Task 12: Public renderer server route + draft 404

**Files:**
- Create: `server/api/invitations/[slug].get.ts`
- Test: `tests/api/invitation-route.test.ts`

- [ ] **Step 1: Write the failing test (pure visibility helper)**

The route's draft-visibility rule is extracted to a pure helper so it is unit-testable without HTTP.

`tests/api/invitation-route.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { canView } from '../../server/utils/visibility'

describe('canView', () => {
  it('anyone can view published', () => {
    expect(canView({ status: 'published', ownerId: 'o1' }, null)).toBe(true)
  })
  it('non-owner cannot view draft', () => {
    expect(canView({ status: 'draft', ownerId: 'o1' }, 'o2')).toBe(false)
    expect(canView({ status: 'draft', ownerId: 'o1' }, null)).toBe(false)
  })
  it('owner can view their draft', () => {
    expect(canView({ status: 'draft', ownerId: 'o1' }, 'o1')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/invitation-route.test.ts`
Expected: FAIL — cannot resolve `server/utils/visibility`.

- [ ] **Step 3: Implement helper + route**

`server/utils/visibility.ts`:
```ts
export function canView(inv: { status: string; ownerId: string }, viewerId: string | null) {
  return inv.status === 'published' || inv.ownerId === viewerId
}
```

`server/api/invitations/[slug].get.ts`:
```ts
import { loadInvitationBySlug } from '../../utils/invitation'
import { canView } from '../../utils/visibility'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const inv = await loadInvitationBySlug(slug)
  if (!inv) throw createError({ statusCode: 404, message: 'Not found' })

  const session = await getUserSession(event)
  const viewerId = (session as any)?.user?.id ?? null
  if (!canView({ status: inv.status, ownerId: inv.ownerId! }, viewerId)) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // published invitations change rarely; cache + revalidate on save (Phase 2 invalidation)
  if (inv.status === 'published') {
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  }
  const { ownerId, ...publicData } = inv
  return publicData
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/invitation-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add public invitation server route with draft 404 and caching"
```

---

## Task 13: YouTube lite-embed component

**Files:**
- Create: `app/components/invitation/YouTubeEmbed.vue`
- Test: `tests/components/YouTubeEmbed.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/YouTubeEmbed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YouTubeEmbed from '../../app/components/invitation/YouTubeEmbed.vue'

describe('YouTubeEmbed', () => {
  it('shows a thumbnail facade first, no iframe', () => {
    const w = mount(YouTubeEmbed, { props: { videoId: 'dQw4w9WgXcQ' } })
    expect(w.find('iframe').exists()).toBe(false)
    expect(w.find('img').attributes('src')).toContain('dQw4w9WgXcQ')
  })
  it('loads the iframe after click', async () => {
    const w = mount(YouTubeEmbed, { props: { videoId: 'dQw4w9WgXcQ' } })
    await w.find('button').trigger('click')
    expect(w.find('iframe').attributes('src')).toContain('dQw4w9WgXcQ')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/YouTubeEmbed.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement**

`app/components/invitation/YouTubeEmbed.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ videoId: string }>()
const playing = ref(false)
const thumb = computed(() => `https://i.ytimg.com/vi/${props.videoId}/hqdefault.jpg`)
const src = computed(() => `https://www.youtube-nocookie.com/embed/${props.videoId}?autoplay=1`)
</script>

<template>
  <div class="relative aspect-video w-full overflow-hidden rounded">
    <iframe v-if="playing" :src="src" class="h-full w-full" allow="autoplay; encrypted-media" allowfullscreen />
    <button v-else type="button" class="group relative block h-full w-full" @click="playing = true">
      <img :src="thumb" alt="" class="h-full w-full object-cover" loading="lazy" />
      <span class="absolute inset-0 grid place-items-center">
        <span class="rounded-full bg-black/60 px-4 py-2 text-white">▶</span>
      </span>
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/YouTubeEmbed.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add YouTube lite-embed facade component"
```

---

## Task 14: Section components + registry component wiring

**Files:**
- Create: 13 components under `app/components/invitation/sections/`, plus `app/components/invitation/SectionRenderer.vue`
- Modify: `app/components/invitation/` only (no server registry changes — components are resolved on the client by a name map to keep server registry framework-free)
- Test: `tests/components/SectionRenderer.test.ts`, `tests/components/sections.test.ts`

Components are **dumb**: each takes a `content` prop already validated by the loader and renders markup using token CSS vars. The renderer maps `type → component` by name.

- [ ] **Step 1: Write the failing tests**

`tests/components/sections.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroSection from '../../app/components/invitation/sections/HeroSection.vue'
import GallerySection from '../../app/components/invitation/sections/GallerySection.vue'
import LoveGiftSection from '../../app/components/invitation/sections/LoveGiftSection.vue'

describe('section components', () => {
  it('Hero renders title + couple name', () => {
    const w = mount(HeroSection, { props: { content: { title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' } } })
    expect(w.text()).toContain('The Wedding Of')
    expect(w.text()).toContain('Willy & Debby')
  })
  it('Gallery renders a YouTube item via embed', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [{ type: 'youtube', videoId: 'dQw4w9WgXcQ' }] } },
      global: { stubs: { YouTubeEmbed: { props: ['videoId'], template: '<div class="yt">{{ videoId }}</div>' }, NuxtImg: true } },
    })
    expect(w.find('.yt').text()).toBe('dQw4w9WgXcQ')
  })
  it('LoveGift renders bank accounts', () => {
    const w = mount(LoveGiftSection, { props: { content: { note: 'Tanpa mengurangi rasa hormat', banks: [{ bank: 'BCA', number: '123', holder: 'Willy' }] } } })
    expect(w.text()).toContain('BCA')
    expect(w.text()).toContain('123')
  })
})
```

`tests/components/SectionRenderer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionRenderer from '../../app/components/invitation/SectionRenderer.vue'

describe('SectionRenderer', () => {
  it('renders the component matching the section type', () => {
    const w = mount(SectionRenderer, {
      props: { section: { type: 'quote', content: { text: 'Cinta sejati', source: 'X' } } },
    })
    expect(w.text()).toContain('Cinta sejati')
  })
  it('renders nothing for an unknown type without throwing', () => {
    const w = mount(SectionRenderer, { props: { section: { type: 'nope', content: {} } } })
    expect(w.html()).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/sections.test.ts tests/components/SectionRenderer.test.ts`
Expected: FAIL — cannot resolve components.

- [ ] **Step 3: Implement the 13 section components**

Each file goes in `app/components/invitation/sections/`. All read `content` from props; themed values use CSS vars set on the invitation root.

`HeroSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { title: string; coupleName: string; date: string } }>()
</script>
<template>
  <section class="py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p class="tracking-widest uppercase">{{ content.title }}</p>
    <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p v-if="content.date">{{ content.date }}</p>
  </section>
</template>
```

`OpeningSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 class="text-2xl" style="font-family: var(--font-heading)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-3 max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>
```

`CoupleSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { people: Array<{ name: string; parents: string; childOrder: string; address: string; instagram: string; photoMediaId: string | null }> } }>()
</script>
<template>
  <section class="space-y-10 px-6 py-12">
    <div v-for="(p, i) in content.people" :key="i" class="text-center">
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
      <p v-if="p.childOrder" class="mt-1">{{ p.childOrder }}</p>
      <p v-if="p.parents" class="mt-1 whitespace-pre-line">{{ p.parents }}</p>
      <p v-if="p.address" class="mt-1 text-sm text-gray-600">{{ p.address }}</p>
      <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
    </div>
  </section>
</template>
```

`EventSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { events: Array<{ name: string; date: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-8 px-6 py-12">
    <div v-for="(e, i) in content.events" :key="i" class="rounded-lg p-6 text-center" style="background: var(--color-bg)">
      <h3 class="text-xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p class="mt-2">{{ e.date }}</p>
      <p v-if="e.timeStart">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener" class="mt-3 inline-block rounded px-4 py-2 text-white" style="background: var(--color-primary)">Lihat Lokasi</a>
    </div>
  </section>
</template>
```

`CountdownSection.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ content: { targetDate: string } }>()
const now = ref(Date.now())
let timer: any
onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => clearInterval(timer))
const remain = computed(() => {
  const diff = Math.max(0, new Date(props.content.targetDate).getTime() - now.value)
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
})
</script>
<template>
  <section class="px-6 py-12 text-center">
    <div class="flex justify-center gap-4">
      <div v-for="u in [['Hari', remain.d], ['Jam', remain.h], ['Menit', remain.m], ['Detik', remain.s]]" :key="u[0] as string">
        <div class="text-3xl" style="color: var(--color-primary)">{{ u[1] }}</div>
        <div class="text-xs uppercase">{{ u[0] }}</div>
      </div>
    </div>
  </section>
</template>
```

`QuoteSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { text: string; source: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center" style="background: var(--color-bg)">
    <blockquote class="mx-auto max-w-xl text-lg italic" style="font-family: var(--font-heading)">"{{ content.text }}"</blockquote>
    <p v-if="content.source" class="mt-2 text-sm">— {{ content.source }}</p>
  </section>
</template>
```

`LoveGiftSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { note: string; banks: Array<{ bank: string; number: string; holder: string }> } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Love Gift</h2>
    <p v-if="content.note" class="mx-auto mt-2 max-w-xl">{{ content.note }}</p>
    <div class="mx-auto mt-6 max-w-sm space-y-3">
      <div v-for="(b, i) in content.banks" :key="i" class="rounded-lg border p-4">
        <div class="font-semibold">{{ b.bank }}</div>
        <div class="text-lg tracking-wider">{{ b.number }}</div>
        <div class="text-sm text-gray-600">a.n. {{ b.holder }}</div>
      </div>
    </div>
  </section>
</template>
```

`GallerySection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { items: Array<{ type: 'image'; mediaId: string } | { type: 'youtube'; videoId: string }> } }>()
// For Phase 1, image items render via a media URL resolved upstream; here mediaId doubles as the URL when seeded.
</script>
<template>
  <section class="px-2 py-12">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
      <template v-for="(item, i) in content.items" :key="i">
        <YouTubeEmbed v-if="item.type === 'youtube'" :video-id="item.videoId" class="col-span-2 md:col-span-3" />
        <NuxtImg v-else :src="item.mediaId" alt="" class="h-full w-full object-cover" loading="lazy" />
      </template>
    </div>
  </section>
</template>
```

`ClosingSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { body: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <p class="mx-auto max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>
```

`InfoSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { phone: string; socials: Array<{ label: string; url: string }> } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 class="text-xl" style="font-family: var(--font-heading)">Info Lebih Lanjut</h2>
    <p v-if="content.phone" class="mt-2">{{ content.phone }}</p>
    <div class="mt-3 flex justify-center gap-4">
      <a v-for="(s, i) in content.socials" :key="i" :href="s.url" style="color: var(--color-accent)">{{ s.label }}</a>
    </div>
  </section>
</template>
```

`RsvpSection.vue` (form UI only; submit wired in Phase 3):
```vue
<script setup lang="ts">
defineProps<{ content: { title: string } }>()
</script>
<template>
  <section class="px-6 py-12">
    <h2 class="text-center text-xl" style="font-family: var(--font-heading)">{{ content.title }}</h2>
    <form class="mx-auto mt-4 max-w-md space-y-3" @submit.prevent>
      <input placeholder="Nama" class="w-full rounded border p-2" />
      <select class="w-full rounded border p-2">
        <option value="yes">Hadir</option>
        <option value="no">Tidak Hadir</option>
        <option value="maybe">Mungkin</option>
      </select>
      <textarea placeholder="Ucapan & Doa" class="w-full rounded border p-2" />
      <button type="submit" class="w-full rounded p-2 text-white" style="background: var(--color-primary)" disabled>Kirim (segera hadir)</button>
    </form>
  </section>
</template>
```

`GuestbookSection.vue` (list UI; live data in Phase 3):
```vue
<script setup lang="ts">
defineProps<{ content: { title: string } }>()
const entries: Array<{ name: string; message: string }> = []
</script>
<template>
  <section class="px-6 py-12">
    <h2 class="text-center text-xl" style="font-family: var(--font-heading)">{{ content.title }}</h2>
    <p v-if="!entries.length" class="mt-3 text-center text-sm text-gray-500">Belum ada ucapan.</p>
    <ul class="mx-auto mt-4 max-w-md space-y-3">
      <li v-for="(e, i) in entries" :key="i" class="rounded border p-3">
        <div class="font-semibold">{{ e.name }}</div>
        <div class="text-sm">{{ e.message }}</div>
      </li>
    </ul>
  </section>
</template>
```

`FooterSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <footer class="px-6 py-10 text-center text-sm" style="background: var(--color-primary); color: white">
    {{ content.text || 'Made with Lovree' }}
  </footer>
</template>
```

- [ ] **Step 4: Implement SectionRenderer**

`app/components/invitation/SectionRenderer.vue`:
```vue
<script setup lang="ts">
import HeroSection from './sections/HeroSection.vue'
import OpeningSection from './sections/OpeningSection.vue'
import CoupleSection from './sections/CoupleSection.vue'
import EventSection from './sections/EventSection.vue'
import CountdownSection from './sections/CountdownSection.vue'
import QuoteSection from './sections/QuoteSection.vue'
import LoveGiftSection from './sections/LoveGiftSection.vue'
import GallerySection from './sections/GallerySection.vue'
import ClosingSection from './sections/ClosingSection.vue'
import InfoSection from './sections/InfoSection.vue'
import RsvpSection from './sections/RsvpSection.vue'
import GuestbookSection from './sections/GuestbookSection.vue'
import FooterSection from './sections/FooterSection.vue'

const componentMap: Record<string, any> = {
  hero: HeroSection, opening: OpeningSection, couple: CoupleSection, event: EventSection,
  countdown: CountdownSection, quote: QuoteSection, love_gift: LoveGiftSection, gallery: GallerySection,
  closing: ClosingSection, info: InfoSection, rsvp: RsvpSection, guestbook: GuestbookSection, footer: FooterSection,
}
const props = defineProps<{ section: { type: string; content: any } }>()
const resolved = computed(() => componentMap[props.section.type] ?? null)
</script>

<template>
  <component :is="resolved" v-if="resolved" :content="section.content" />
</template>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/sections.test.ts tests/components/SectionRenderer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: add 13 dumb section components and type->component renderer"
```

---

## Task 15: Cover modal + music player

**Files:**
- Create: `app/components/invitation/CoverModal.vue`, `app/components/invitation/MusicPlayer.vue`
- Test: `tests/components/CoverModal.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/CoverModal.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverModal from '../../app/components/invitation/CoverModal.vue'

describe('CoverModal', () => {
  it('shows title, couple, and guest name', () => {
    const w = mount(CoverModal, { props: { title: 'The Wedding Of', coupleName: 'Willy & Debby', guestName: 'Budi' } })
    expect(w.text()).toContain('Willy & Debby')
    expect(w.text()).toContain('Budi')
  })
  it('emits open when the button is clicked', async () => {
    const w = mount(CoverModal, { props: { title: 'T', coupleName: 'C', guestName: 'G' } })
    await w.find('button').trigger('click')
    expect(w.emitted('open')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/CoverModal.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement**

`app/components/invitation/CoverModal.vue`:
```vue
<script setup lang="ts">
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <div>
      <p class="tracking-widest uppercase">{{ title }}</p>
      <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <p class="mt-6 text-sm">Kepada Yth.</p>
      <p class="text-lg font-semibold">{{ guestName }}</p>
      <button type="button" class="mt-8 rounded-full px-6 py-3 text-white" style="background: var(--color-primary)" @click="$emit('open')">
        Buka Undangan
      </button>
    </div>
  </div>
</template>
```

`app/components/invitation/MusicPlayer.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ src: string; playing: boolean }>()
const audio = ref<HTMLAudioElement | null>(null)
const muted = ref(false)
watch(() => props.playing, (p) => { if (p) audio.value?.play().catch(() => {}) })
function toggle() {
  muted.value = !muted.value
  if (audio.value) audio.value.muted = muted.value
}
</script>
<template>
  <div>
    <audio ref="audio" :src="src" loop />
    <button v-if="playing" type="button" class="fixed bottom-4 right-4 z-40 rounded-full p-3 text-white shadow" style="background: var(--color-primary)" @click="toggle">
      {{ muted ? '🔇' : '🔊' }}
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/CoverModal.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add cover modal and music player components"
```

---

## Task 16: InvitationRoot + public page

**Files:**
- Create: `app/components/invitation/InvitationRoot.vue`, `app/pages/u/[slug].vue`
- Test: `tests/components/InvitationRoot.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/InvitationRoot.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InvitationRoot from '../../app/components/invitation/InvitationRoot.vue'

const data = {
  cssVars: { '--color-primary': '#abc' },
  musicUrl: 'https://x/song.mp3',
  sections: [
    { type: 'hero', content: { title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' } },
    { type: 'footer', content: { text: 'bye' } },
  ],
}

describe('InvitationRoot', () => {
  it('applies css vars and shows cover first (sections hidden)', () => {
    const w = mount(InvitationRoot, { props: { data, guestName: 'Budi' } })
    expect(w.attributes('style')).toContain('--color-primary: #abc')
    expect(w.findComponent({ name: 'CoverModal' }).exists()).toBe(true)
  })
  it('reveals sections after cover opens', async () => {
    const w = mount(InvitationRoot, { props: { data, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAllComponents({ name: 'SectionRenderer' }).length).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/InvitationRoot.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement InvitationRoot**

`app/components/invitation/InvitationRoot.vue`:
```vue
<script setup lang="ts">
import CoverModal from './CoverModal.vue'
import MusicPlayer from './MusicPlayer.vue'
import SectionRenderer from './SectionRenderer.vue'

const props = defineProps<{
  data: { cssVars: Record<string, string>; musicUrl: string | null; sections: Array<{ type: string; content: any }> }
  guestName: string
}>()

const opened = ref(false)
const styleStr = computed(() => Object.entries(props.data.cssVars).map(([k, v]) => `${k}: ${v}`).join('; '))
const hero = computed(() => props.data.sections.find((s) => s.type === 'hero')?.content ?? { title: '', coupleName: '' })

function open() {
  opened.value = true
  if (import.meta.client) document.body.style.overflow = ''
}
onMounted(() => { if (!opened.value) document.body.style.overflow = 'hidden' })
</script>

<template>
  <div class="invitation min-h-screen" :style="styleStr">
    <CoverModal v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
    <template v-if="opened">
      <SectionRenderer v-for="(s, i) in data.sections" :key="i" :section="s" />
      <MusicPlayer v-if="data.musicUrl" :src="data.musicUrl" :playing="opened" />
    </template>
  </div>
</template>
```

- [ ] **Step 4: Implement the page**

`app/pages/u/[slug].vue`:
```vue
<script setup lang="ts">
import InvitationRoot from '~/components/invitation/InvitationRoot.vue'

const route = useRoute()
const slug = route.params.slug as string
const guestName = computed(() => {
  const g = route.query.guest
  return (Array.isArray(g) ? g[0] : g) || 'Tamu Undangan'
})

const { data, error } = await useFetch(`/api/invitations/${slug}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan' })
</script>

<template>
  <InvitationRoot v-if="data" :data="data" :guest-name="guestName" />
</template>
```

Note: `guestName` shows the raw `?guest=` value for Phase 1; resolving a guest `code` → stored name lands in Phase 3 alongside the guest write paths.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/InvitationRoot.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Full manual verification**

Run: `npm run dev`. Visit `/u/demo-wedding?guest=Budi`:
- Expected: cover shows "Willy & Debby" + "Budi"; body scroll locked.
- Click "Buka Undangan" → cover disappears, sections render in order, music control appears, scroll unlocks.
- Visit `/u/demo-wedding` (no guest) → cover shows "Tamu Undangan".
- Visit `/u/does-not-exist` → 404.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat: add InvitationRoot orchestrator and public /u/:slug page"
```

---

## Task 17: Full-suite verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm run test`
Expected: all specs pass (schema, field-types, sections, tokens, storage, password, google-link, invitation, visibility, YouTubeEmbed, sections components, SectionRenderer, CoverModal, InvitationRoot).

- [ ] **Step 2: Typecheck**

Run: `npx nuxi typecheck`
Expected: no errors.

- [ ] **Step 3: Verify the registry-extensibility criterion**

Add a throwaway `test_banner` entry to `sectionRegistry` (schema `{ text }`) + a `TestBannerSection.vue` + one line in `componentMap`. Add a section row via seed or DB. Confirm it renders at `/u/demo-wedding` with **zero** edits to `InvitationRoot.vue`, `SectionRenderer.vue` control flow (only the map entry), or the loader. Then revert the throwaway.

- [ ] **Step 4: Commit (if any fixes were needed)**
```bash
git add -A
git commit -m "test: verify full Phase 0+1 suite and registry extensibility"
```

---

## Success Criteria Checklist (from spec §11)

- [ ] 1. Migrations create all tables (Task 2).
- [ ] 2. Seed creates theme + published invitation + sections + media + guest (Task 10).
- [ ] 3. `/u/:slug` shows cover; "Buka Undangan" dismisses it, starts music, reveals sections in order (Tasks 15, 16).
- [ ] 4. `?guest=` personalizes cover; unknown guest degrades to "Tamu Undangan" (Task 16).
- [ ] 5. Draft returns 404 to non-owner, renders for owner (Task 12).
- [ ] 6. Theme tokens + overrides appear as CSS vars driving colors/fonts (Tasks 5, 16).
- [ ] 7. Email/password + Google OAuth login work; `/admin` gated (Tasks 7, 8, 9).
- [ ] 8. New section type renders with zero renderer control-flow changes (Task 17 Step 3).

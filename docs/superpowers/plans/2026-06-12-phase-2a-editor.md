# Lovree v3 — Phase 2a (Core Editor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated owner create an invitation, edit its sections with an instant live preview, upload media, toggle/reorder/add/remove sections, autosave to a draft, and publish it to guests.

**Architecture:** Retire the normalized `sections` table; an invitation now holds two JSONB documents (`draft_document`, `published_document`) shaped `{ sections: [{ id, type, enabled, content }] }`. The editor mutates a reactive copy of the draft document and renders the production `<SectionRenderer>` live in a containment-scoped preview pane. Autosave PATCHes the full document (debounced, server-validated, owner-checked); Publish snapshots draft→published and bumps a cache version. Pure functions (`validateDraftDocument`, `assertOwner`, `draftToPublished`, `validateMediaUpload`, `deriveFieldEditors`, `autosaveDebounce`) carry the logic; UI is a thin shell.

**Tech Stack:** Nuxt 4 (Nitro), Drizzle/Neon, nuxt-auth-utils, Zod, @aws-sdk/client-s3 (R2), Vitest + @vue/test-utils, nanoid.

Spec: `docs/superpowers/specs/2026-06-11-phase-2a-editor-design.md`. Builds on the Phase 0+1 codebase on branch `feat/foundation-renderer`.

---

## File Structure

```
server/db/schema.ts                          MODIFY: drop sections table; add draft_document/published_document/published_at to invitations
server/db/seed.ts                            MODIFY: write documents instead of section rows
server/registry/sections.ts                  MODIFY: add `fields` descriptor per section; export FieldDescriptor types
server/document/
  types.ts                                   InvitationDocument / DocumentSection types
  validate.ts                                validateDraftDocument(doc) pure
  publish.ts                                 draftToPublished(doc) pure
server/utils/
  invitation.ts                              MODIFY: assembleInvitation reads sections array; loadInvitationBySlug reads published_document
  ownership.ts                               assertOwner(inv, userId) pure
  media-validate.ts                          validateMediaUpload({size,bytes,kind}) pure (magic bytes)
server/api/admin/
  invitations/index.get.ts                   list owned
  invitations/index.post.ts                  create
  invitations/[id]/index.get.ts              get draft (owner)
  invitations/[id]/draft.patch.ts            autosave
  invitations/[id]/publish.post.ts           publish + cache bump
  media.post.ts                              upload
server/api/invitations/[slug].get.ts         MODIFY: ETag from published_at
app/composables/
  useInvitationEditor.ts                     reactive document store + structural ops
  useAutosave.ts                             debounce wrapper around PATCH
app/utils/
  field-editors.ts                           deriveFieldEditors(sectionType) (client mirror of registry descriptors) + control map
app/components/editor/
  FieldEditor.vue                            dispatch field type -> control
  controls/TextControl.vue / LongtextControl.vue / DateControl.vue / UrlControl.vue / YoutubeControl.vue / ImageControl.vue / ListControl.vue
  SectionEditor.vue                          one section: its field editors + remove/onoff
  SectionList.vue                            add/reorder/onoff/remove panel
  EditorPreview.vue                          preview pane (containment + mobile/desktop + cover/content toggle)
  SaveStatus.vue                             autosave indicator
  MediaUploader.vue                          file input -> POST /api/admin/media
app/pages/admin/
  invitations/index.vue                      list + create
  invitations/[id]/edit.vue                  editor shell (panel + preview + publish)
```

---

## Task 1: Data model pivot — documents replace the sections table

**Files:**
- Modify: `server/db/schema.ts`
- Test: `tests/db/schema.test.ts` (update)

- [ ] **Step 1: Update the failing test**

Edit `tests/db/schema.test.ts` to assert the new shape and the removal of `sections`:
```ts
import { describe, it, expect } from 'vitest'
import * as schema from '../../server/db/schema'

describe('schema', () => {
  it('exports the expected tables (no separate sections table)', () => {
    for (const t of ['users', 'themes', 'invitations', 'guests', 'rsvps', 'media']) {
      expect(schema, `missing table ${t}`).toHaveProperty(t)
    }
    expect(schema).not.toHaveProperty('sections')
  })
  it('invitations has document columns', () => {
    const cols = Object.keys((schema.invitations as any))
    expect(cols).toEqual(expect.arrayContaining(['draftDocument', 'publishedDocument', 'publishedAt']))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: FAIL (sections still present / new columns missing).

- [ ] **Step 3: Edit the schema**

In `server/db/schema.ts`: delete the entire `export const sections = pgTable('sections', ...)` block and remove `sections` from the `index` import usage if it referenced it. Remove the now-unused `index` import only if nothing else uses it (it does not, after this). Add three columns to `invitations`:
```ts
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(),
  themeId: uuid('theme_id').notNull().references(() => themes.id),
  tokenOverrides: jsonb('token_overrides').notNull().default({}),
  status: text('status').notNull().default('draft'),
  musicMediaId: uuid('music_media_id'),
  draftDocument: jsonb('draft_document').notNull().default({ sections: [] }),
  publishedDocument: jsonb('published_document'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
```
Keep `guests`, `rsvps`, `media`, `themes`, `users` unchanged. (Note: `guests`/`rsvps` still FK to `invitations.id`, unaffected.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate migration**

Run: `DATABASE_URL=postgres://x:x@x/x npm run db:generate`
Expected: a new migration under `server/db/migrations/` that DROPs `sections` and ALTERs `invitations` to add the three columns. Inspect it to confirm. Do NOT run `db:migrate`.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: replace sections table with draft/published JSONB documents"
```

---

## Task 2: Document types + validateDraftDocument

**Files:**
- Create: `server/document/types.ts`, `server/document/validate.ts`
- Test: `tests/document/validate.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/document/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateDraftDocument } from '../../server/document/validate'

describe('validateDraftDocument', () => {
  it('keeps known sections, fills content defaults, preserves id/enabled/order', () => {
    const out = validateDraftDocument({
      sections: [
        { id: 'a', type: 'hero', enabled: true, content: { title: 'T' } },
        { id: 'b', type: 'quote', enabled: false, content: {} },
      ],
    })
    expect(out.sections.map((s) => s.id)).toEqual(['a', 'b'])
    expect(out.sections[0].content.title).toBe('T')
    expect(out.sections[0].content.coupleName).toBe('') // default filled
    expect(out.sections[1].enabled).toBe(false)
  })
  it('drops unknown section types', () => {
    const out = validateDraftDocument({ sections: [{ id: 'x', type: 'nope', enabled: true, content: {} }] })
    expect(out.sections).toEqual([])
  })
  it('tolerates a malformed root, returning an empty document', () => {
    expect(validateDraftDocument(null as any)).toEqual({ sections: [] })
    expect(validateDraftDocument({} as any)).toEqual({ sections: [] })
  })
  it('generates an id when a section is missing one', () => {
    const out = validateDraftDocument({ sections: [{ type: 'hero', enabled: true, content: {} } as any] })
    expect(out.sections[0].id).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/document/validate.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`server/document/types.ts`:
```ts
import type { SectionType } from '../registry/sections'

export interface DocumentSection {
  id: string
  type: SectionType
  enabled: boolean
  content: any
}
export interface InvitationDocument {
  sections: DocumentSection[]
}
```

`server/document/validate.ts`:
```ts
import { nanoid } from 'nanoid'
import { SECTION_TYPES, validateContent, type SectionType } from '../registry/sections'
import type { InvitationDocument } from './types'

export function validateDraftDocument(raw: unknown): InvitationDocument {
  const sectionsIn = (raw && typeof raw === 'object' && Array.isArray((raw as any).sections))
    ? (raw as any).sections
    : []
  const sections = sectionsIn
    .filter((s: any) => s && SECTION_TYPES.includes(s.type as SectionType))
    .map((s: any) => ({
      id: typeof s.id === 'string' && s.id ? s.id : nanoid(),
      type: s.type as SectionType,
      enabled: s.enabled !== false,
      content: validateContent(s.type as SectionType, s.content),
    }))
  return { sections }
}
```
Install: `npm install nanoid`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/document/validate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add invitation document types and validateDraftDocument"
```

---

## Task 3: draftToPublished

**Files:**
- Create: `server/document/publish.ts`
- Test: `tests/document/publish.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/document/publish.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { draftToPublished } from '../../server/document/publish'

describe('draftToPublished', () => {
  it('produces a validated deep copy independent of the draft', () => {
    const draft = { sections: [{ id: 'a', type: 'hero', enabled: true, content: { title: 'T' } }] }
    const published = draftToPublished(draft)
    expect(published.sections[0].content.title).toBe('T')
    // mutating the draft afterwards must not affect the snapshot
    draft.sections[0].content.title = 'CHANGED'
    expect(published.sections[0].content.title).toBe('T')
  })
  it('drops unknown types via validation', () => {
    const published = draftToPublished({ sections: [{ id: 'x', type: 'nope', enabled: true, content: {} }] })
    expect(published.sections).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/document/publish.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server/document/publish.ts`:
```ts
import { validateDraftDocument } from './validate'
import type { InvitationDocument } from './types'

// Snapshot the draft into the published document. Re-validates and deep-copies
// (via validateContent rebuilding content) so the snapshot is independent and clean.
export function draftToPublished(draft: unknown): InvitationDocument {
  return validateDraftDocument(draft)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/document/publish.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add draftToPublished snapshot mapping"
```

---

## Task 4: Adapt assembleInvitation + loadInvitationBySlug to documents

**Files:**
- Modify: `server/utils/invitation.ts`
- Test: `tests/utils/invitation.test.ts` (update)

- [ ] **Step 1: Update the failing test**

Replace `tests/utils/invitation.test.ts` with the document-based shape:
```ts
import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

describe('assembleInvitation', () => {
  const theme = { tokens: { color: { primary: '#abc' } } }
  const inv = { id: 'i1', slug: 'x', type: 'wedding', status: 'published', tokenOverrides: { color: { primary: '#111' } } }

  it('orders enabled sections from the document and drops disabled', () => {
    const sections = [
      { id: 'a', type: 'hero', enabled: true, content: { title: 'T' } },
      { id: 'b', type: 'gallery', enabled: false, content: {} },
      { id: 'c', type: 'quote', enabled: true, content: {} },
    ]
    const out = assembleInvitation(inv as any, theme as any, sections as any)
    expect(out.sections.map((s) => s.type)).toEqual(['hero', 'quote'])
  })

  it('validates content and exposes resolved css vars', () => {
    const out = assembleInvitation(inv as any, theme as any, [{ id: 'a', type: 'hero', enabled: true, content: { title: 'T' } }] as any)
    expect(out.sections[0].content.title).toBe('T')
    expect(out.sections[0].content.coupleName).toBe('')
    expect(out.cssVars['--color-primary']).toBe('#111')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/invitation.test.ts`
Expected: FAIL (current assembleInvitation expects rows with `position`).

- [ ] **Step 3: Update the implementation**

In `server/utils/invitation.ts`:

Replace `assembleInvitation` so it consumes document sections (already ordered by array position; filter `enabled`, validate `content`). Replace the `loadInvitationBySlug` body to read `publishedDocument`.

```ts
import { eq, and } from 'drizzle-orm'
import { useDb } from '../db'
import { invitations, themes, media } from '../db/schema'
import { validateContent, SECTION_TYPES, type SectionType } from '../registry/sections'
import { resolveTokens, tokensToCssVars } from '../theme/tokens'

export interface AssembledSection { type: SectionType; content: any }
export interface AssembledInvitation {
  id: string; slug: string; type: string; status: string; ownerId?: string
  cssVars: Record<string, string>
  sections: AssembledSection[]
}
export type LoadedInvitation = AssembledInvitation & { musicUrl: string | null }

export function assembleInvitation(inv: any, theme: any, sections: any[]): AssembledInvitation {
  const ordered = (Array.isArray(sections) ? sections : [])
    .filter((s) => s.enabled !== false)
    .filter((s) => SECTION_TYPES.includes(s.type as SectionType))
    .map((s) => ({ type: s.type as SectionType, content: validateContent(s.type as SectionType, s.content) }))
  const cssVars = tokensToCssVars(resolveTokens(theme?.tokens ?? {}, inv.tokenOverrides ?? {}))
  return { id: inv.id, slug: inv.slug, type: inv.type, status: inv.status, ownerId: inv.ownerId, cssVars, sections: ordered }
}

export async function loadInvitationBySlug(slug: string): Promise<LoadedInvitation | null> {
  const db = useDb()
  const rows = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1)
  const inv = rows[0]
  if (!inv) return null
  const doc = (inv.publishedDocument as any) ?? { sections: [] }
  const themeRows = await db.select().from(themes).where(eq(themes.id, inv.themeId)).limit(1)
  const assembled = assembleInvitation(inv, themeRows[0], doc.sections ?? [])

  let musicUrl: string | null = null
  if (inv.musicMediaId) {
    const mediaRows = await db.select().from(media).where(and(eq(media.id, inv.musicMediaId), eq(media.type, 'audio'))).limit(1)
    musicUrl = mediaRows[0]?.url || null
  }
  return { ...assembled, ownerId: inv.ownerId, musicUrl }
}
```
Remove the now-unused `sections` import from the db schema in this file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/invitation.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run` (all green) and `npx nuxi prepare && npx nuxi typecheck` (exit 0). Fix any reference to the removed `sections` table that surfaces (e.g. the public route already passes through the loader; the only consumers are the loader and seed).

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: read sections from published_document instead of the sections table"
```

---

## Task 5: Update the seed to documents

**Files:**
- Modify: `server/db/seed.ts`

- [ ] **Step 1: Rewrite the seed**

Replace the sections-insert block. Build a document and write both `draft_document` and `published_document` on the invitation.

`server/db/seed.ts`:
```ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from './index'
import { users, themes, invitations, guests, media } from './schema'
import { hashPassword } from '../utils/password'
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
    email: 'demo@lovree.com', passwordHash: await hashPassword('password123'), name: 'Demo Owner',
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
```

- [ ] **Step 2: Typecheck the seed**

Run: `npx nuxi typecheck` (exit 0). No DB run.

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "feat: seed invitation as draft/published documents"
```

---

## Task 6: Registry field descriptors + deriveFieldEditors

**Files:**
- Modify: `server/registry/sections.ts` (add `fields` descriptors + types)
- Create: `app/utils/field-editors.ts`
- Test: `tests/registry/field-descriptors.test.ts`, `tests/utils/field-editors.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/registry/field-descriptors.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sectionRegistry } from '../../server/registry/sections'

describe('field descriptors', () => {
  it('every section defines a fields descriptor map', () => {
    for (const [type, def] of Object.entries(sectionRegistry)) {
      expect((def as any).fields, `missing fields for ${type}`).toBeTruthy()
    }
  })
  it('hero exposes title/coupleName/date with types', () => {
    const f = (sectionRegistry.hero as any).fields
    expect(f.title.type).toBe('text')
    expect(f.date.type).toBe('date')
  })
})
```

`tests/utils/field-editors.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveFieldEditors } from '../../app/utils/field-editors'

describe('deriveFieldEditors', () => {
  it('returns ordered editor descriptors for a section type', () => {
    const editors = deriveFieldEditors('hero')
    expect(editors.map((e) => e.key)).toEqual(['title', 'coupleName', 'date'])
    expect(editors.find((e) => e.key === 'date')!.type).toBe('date')
  })
  it('returns [] for an unknown type', () => {
    expect(deriveFieldEditors('nope' as any)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/registry/field-descriptors.test.ts tests/utils/field-editors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add descriptors to the registry**

In `server/registry/sections.ts`, add a `FieldType` union + `fields` map to each entry, and export the descriptor type. Use these field descriptors (types reflect the schema shape; `list` items get an `itemFields` descriptor):
```ts
export type FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list'
export interface FieldDescriptor {
  type: FieldType
  label: string
  itemFields?: Record<string, FieldDescriptor> // for `list`
}

// per-section fields (add the `fields` key to each existing registry entry):
hero:      { ..., fields: { title:{type:'text',label:'Judul'}, coupleName:{type:'text',label:'Nama Pasangan'}, date:{type:'date',label:'Tanggal'} } }
opening:   { ..., fields: { greeting:{type:'text',label:'Salam'}, body:{type:'longtext',label:'Isi'} } }
couple:    { ..., fields: { people:{type:'list',label:'Pasangan',itemFields:{ name:{type:'text',label:'Nama'}, parents:{type:'longtext',label:'Orang Tua'}, childOrder:{type:'text',label:'Anak ke-'}, address:{type:'text',label:'Alamat'}, instagram:{type:'text',label:'Instagram'}, photoMediaId:{type:'image',label:'Foto'} } } } }
event:     { ..., fields: { events:{type:'list',label:'Acara',itemFields:{ name:{type:'text',label:'Nama Acara'}, date:{type:'date',label:'Tanggal'}, timeStart:{type:'text',label:'Mulai'}, timeEnd:{type:'text',label:'Selesai'}, venue:{type:'text',label:'Tempat'}, mapsUrl:{type:'url',label:'Google Maps'} } } } }
countdown: { ..., fields: { targetDate:{type:'date',label:'Tanggal Tujuan'} } }
quote:     { ..., fields: { text:{type:'longtext',label:'Kutipan'}, source:{type:'text',label:'Sumber'} } }
love_gift: { ..., fields: { note:{type:'longtext',label:'Catatan'}, banks:{type:'list',label:'Rekening',itemFields:{ bank:{type:'text',label:'Bank'}, number:{type:'text',label:'No. Rekening'}, holder:{type:'text',label:'Atas Nama'} } } } }
gallery:   { ..., fields: { items:{type:'list',label:'Galeri',itemFields:{ type:{type:'text',label:'Tipe (image/youtube)'}, mediaId:{type:'image',label:'Gambar'}, videoId:{type:'youtube',label:'YouTube ID'} } } } }
closing:   { ..., fields: { body:{type:'longtext',label:'Isi'} } }
info:      { ..., fields: { phone:{type:'text',label:'No. Telepon'}, socials:{type:'list',label:'Sosial Media',itemFields:{ label:{type:'text',label:'Label'}, url:{type:'url',label:'URL'} } } } }
rsvp:      { ..., fields: { title:{type:'text',label:'Judul'} } }
guestbook: { ..., fields: { title:{type:'text',label:'Judul'} } }
footer:    { ..., fields: { text:{type:'text',label:'Teks Footer'} } }
```
Keep each entry's existing `schema` and `label`. The `fields` order defines the editor's field order.

- [ ] **Step 4: Implement deriveFieldEditors (client)**

The registry lives server-side; expose the descriptors to the client via a small re-export the editor imports. `app/utils/field-editors.ts`:
```ts
import { sectionRegistry, type SectionType, type FieldDescriptor } from '../../server/registry/sections'

export interface FieldEditorDescriptor extends FieldDescriptor { key: string }

export function deriveFieldEditors(type: SectionType): FieldEditorDescriptor[] {
  const def = (sectionRegistry as any)[type]
  if (!def?.fields) return []
  return Object.entries(def.fields).map(([key, d]) => ({ key, ...(d as FieldDescriptor) }))
}
```
(Importing the registry into client code is fine — it's pure data + zod, no server-only APIs. If a bundler boundary complains, move the `fields` descriptors into a framework-free `server/registry/field-descriptors.ts` imported by both; prefer the direct import first.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/registry/field-descriptors.test.ts tests/utils/field-editors.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: add registry field descriptors and deriveFieldEditors"
```

---

## Task 7: assertOwner predicate

**Files:**
- Create: `server/utils/ownership.ts`
- Test: `tests/utils/ownership.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/utils/ownership.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isOwner } from '../../server/utils/ownership'

describe('isOwner', () => {
  it('true only when ids match and viewer is set', () => {
    expect(isOwner({ ownerId: 'o1' }, 'o1')).toBe(true)
    expect(isOwner({ ownerId: 'o1' }, 'o2')).toBe(false)
    expect(isOwner({ ownerId: 'o1' }, null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/ownership.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server/utils/ownership.ts`:
```ts
export function isOwner(inv: { ownerId: string }, viewerId: string | null): boolean {
  return viewerId != null && inv.ownerId === viewerId
}

// Convenience for handlers: throws a 404 (not 403) when not the owner, so existence isn't leaked.
export function assertOwnerOr404(inv: { ownerId: string } | null, viewerId: string | null) {
  if (!inv || !isOwner(inv, viewerId)) throw createError({ statusCode: 404, message: 'Not found' })
  return inv
}
```
(`createError` is a Nitro auto-import available in server context.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/ownership.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add isOwner predicate and assertOwnerOr404 helper"
```

---

## Task 8: Media validation (size + magic bytes)

**Files:**
- Create: `server/utils/media-validate.ts`
- Test: `tests/utils/media-validate.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/utils/media-validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateMediaUpload } from '../../server/utils/media-validate'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const MP3 = Buffer.from([0x49, 0x44, 0x33, 0, 0, 0]) // 'ID3'
const TXT = Buffer.from('hello world')

describe('validateMediaUpload', () => {
  it('accepts a png image under the limit', () => {
    expect(validateMediaUpload({ kind: 'image', size: 1000, bytes: PNG })).toEqual({ ok: true, ext: 'png', contentType: 'image/png' })
  })
  it('accepts a jpg and mp3', () => {
    expect(validateMediaUpload({ kind: 'image', size: 1000, bytes: JPG }).ok).toBe(true)
    expect(validateMediaUpload({ kind: 'audio', size: 1000, bytes: MP3 }).ok).toBe(true)
  })
  it('rejects an oversized image (>2MB) before looking at bytes', () => {
    const r = validateMediaUpload({ kind: 'image', size: 2 * 1024 * 1024 + 1, bytes: PNG })
    expect(r.ok).toBe(false)
  })
  it('rejects oversized audio (>5MB)', () => {
    expect(validateMediaUpload({ kind: 'audio', size: 5 * 1024 * 1024 + 1, bytes: MP3 }).ok).toBe(false)
  })
  it('rejects a file whose magic bytes do not match its declared kind', () => {
    expect(validateMediaUpload({ kind: 'image', size: 10, bytes: TXT }).ok).toBe(false)
    expect(validateMediaUpload({ kind: 'image', size: 10, bytes: MP3 }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/media-validate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server/utils/media-validate.ts`:
```ts
export type MediaKind = 'image' | 'audio'
export interface MediaInput { kind: MediaKind; size: number; bytes: Buffer | Uint8Array }
export type MediaResult =
  | { ok: true; ext: string; contentType: string }
  | { ok: false; error: string }

const LIMITS: Record<MediaKind, number> = { image: 2 * 1024 * 1024, audio: 5 * 1024 * 1024 }

function startsWith(b: Uint8Array, sig: number[], offset = 0): boolean {
  for (let i = 0; i < sig.length; i++) if (b[offset + i] !== sig[i]) return false
  return true
}

function sniff(b: Uint8Array): { ext: string; contentType: string; kind: MediaKind } | null {
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return { ext: 'png', contentType: 'image/png', kind: 'image' }
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { ext: 'jpg', contentType: 'image/jpeg', kind: 'image' }
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return { ext: 'webp', contentType: 'image/webp', kind: 'image' }
  if (startsWith(b, [0x49, 0x44, 0x33])) return { ext: 'mp3', contentType: 'audio/mpeg', kind: 'audio' } // ID3
  if (startsWith(b, [0xff, 0xfb]) || startsWith(b, [0xff, 0xf3]) || startsWith(b, [0xff, 0xf2])) return { ext: 'mp3', contentType: 'audio/mpeg', kind: 'audio' } // MPEG frame
  return null
}

export function validateMediaUpload(input: MediaInput): MediaResult {
  if (input.size > LIMITS[input.kind]) return { ok: false, error: 'File too large' }
  const detected = sniff(input.bytes)
  if (!detected || detected.kind !== input.kind) return { ok: false, error: 'Unsupported or mismatched file type' }
  return { ok: true, ext: detected.ext, contentType: detected.contentType }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/media-validate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add media upload validation (size + magic-byte sniff)"
```

---

## Task 9: Admin invitations — list, create, get-draft endpoints

**Files:**
- Create: `server/api/admin/invitations/index.get.ts`, `server/api/admin/invitations/index.post.ts`, `server/api/admin/invitations/[id]/index.get.ts`
- Test: `tests/api/admin-invitations.test.ts` (pure slug helper)

- [ ] **Step 1: Write the failing test (slug helper)**

Create a tiny pure helper for slug generation so it is testable. `tests/api/admin-invitations.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { slugify } from '../../server/utils/slug'

describe('slugify', () => {
  it('lowercases, hyphenates, strips non-alphanumerics', () => {
    expect(slugify('Willy & Debby!')).toBe('willy-debby')
  })
  it('appends a suffix for uniqueness when provided', () => {
    expect(slugify('Hero', 'ab12')).toBe('hero-ab12')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/admin-invitations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement slug helper + endpoints**

`server/utils/slug.ts`:
```ts
export function slugify(input: string, suffix?: string): string {
  const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'undangan'
  return suffix ? `${base}-${suffix}` : base
}
```

`server/api/admin/invitations/index.get.ts`:
```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const rows = await db.select({
    id: invitations.id, slug: invitations.slug, type: invitations.type,
    status: invitations.status, updatedAt: invitations.updatedAt,
  }).from(invitations).where(eq(invitations.ownerId, ownerId))
  return rows
})
```

`server/api/admin/invitations/index.post.ts`:
```ts
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, themes } from '../../../db/schema'
import { slugify } from '../../../utils/slug'

const body = z.object({
  title: z.string().min(1),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']),
  themeId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()
  // pick provided theme or the first available theme
  let themeId = parsed.data.themeId
  if (!themeId) {
    const [t] = await db.select({ id: themes.id }).from(themes).limit(1)
    if (!t) throw createError({ statusCode: 400, message: 'No theme available' })
    themeId = t.id
  }
  const slug = slugify(parsed.data.title, nanoid(6))
  const [inv] = await db.insert(invitations).values({
    ownerId, slug, type: parsed.data.type, themeId,
    status: 'draft', draftDocument: { sections: [] },
  }).returning({ id: invitations.id, slug: invitations.slug })
  return inv
})
```

`server/api/admin/invitations/[id]/index.get.ts`:
```ts
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
```
The editor preview consumes `cssVars` so it shows the theme's colors/fonts.

- [ ] **Step 4: Run test to verify it passes + typecheck**

Run: `npx vitest run tests/api/admin-invitations.test.ts` (PASS) and `npx nuxi typecheck` (exit 0).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add admin invitation list/create/get-draft endpoints + slugify"
```

---

## Task 10: Autosave endpoint (PATCH draft)

**Files:**
- Create: `server/api/admin/invitations/[id]/draft.patch.ts`
- Test: covered by `validateDraftDocument` (Task 2) + ownership (Task 7); add a focused handler-logic note (no new unit test required — the pure pieces are tested).

- [ ] **Step 1: Implement**

`server/api/admin/invitations/[id]/draft.patch.ts`:
```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { validateDraftDocument } from '../../../../document/validate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const body = await readBody(event)
  const doc = validateDraftDocument(body?.document)
  await db.update(invitations).set({ draftDocument: doc, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, document: doc }
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxi typecheck` (exit 0).

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "feat: add draft autosave endpoint (owner-checked, registry-validated)"
```

---

## Task 11: Publish endpoint + cache version on public route

**Files:**
- Create: `server/api/admin/invitations/[id]/publish.post.ts`
- Modify: `server/api/invitations/[slug].get.ts` (ETag from published_at)
- Test: `tests/api/etag.test.ts` (pure etag helper)

- [ ] **Step 1: Write the failing test**

`tests/api/etag.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { publishedEtag } from '../../server/utils/etag'

describe('publishedEtag', () => {
  it('is stable for the same publish time and changes when it changes', () => {
    const a = publishedEtag('i1', new Date('2026-01-01T00:00:00Z'))
    const b = publishedEtag('i1', new Date('2026-01-01T00:00:00Z'))
    const c = publishedEtag('i1', new Date('2026-02-01T00:00:00Z'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
  it('returns a quoted weak-free etag string', () => {
    expect(publishedEtag('i1', new Date(0))).toMatch(/^"[\w-]+"$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/etag.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement etag helper + publish + route change**

`server/utils/etag.ts`:
```ts
export function publishedEtag(id: string, publishedAt: Date | null): string {
  const v = publishedAt ? publishedAt.getTime() : 0
  return `"${id}-${v}"`
}
```

`server/api/admin/invitations/[id]/publish.post.ts`:
```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { draftToPublished } from '../../../../document/publish'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId, draftDocument: invitations.draftDocument })
    .from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const published = draftToPublished(inv!.draftDocument)
  const publishedAt = new Date()
  await db.update(invitations).set({
    publishedDocument: published, publishedAt, status: 'published', updatedAt: publishedAt,
  }).where(eq(invitations.id, id))
  return { ok: true, publishedAt }
})
```

Modify `server/api/invitations/[slug].get.ts` — after loading and the visibility check, set the ETag from `published_at`. The loader currently returns the assembled payload but not `publishedAt`; add `publishedAt` to what `loadInvitationBySlug` returns, then in the route:
```ts
// in server/utils/invitation.ts loadInvitationBySlug return:
//   return { ...assembled, ownerId: inv.ownerId, musicUrl, publishedAt: inv.publishedAt ?? null }
// and add `publishedAt: Date | null` to LoadedInvitation.

// in [slug].get.ts, after canView passes and before returning:
import { publishedEtag } from '../../utils/etag'
// ...
if (inv.status === 'published') {
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  setHeader(event, 'ETag', publishedEtag(inv.id, inv.publishedAt))
  // handleConditional lets a matching If-None-Match short-circuit to 304
  if (handleConditionalRequest && handleConditionalRequest(event, { etag: publishedEtag(inv.id, inv.publishedAt) })) return
}
const { ownerId, publishedAt, ...publicData } = inv
return { ...publicData, guestName }
```
Note: if `handleConditionalRequest` is not available in the Nitro version, just `setHeader('ETag', ...)` — the version-bearing ETag changing on publish is enough to defeat stale caching. Keep it simple: set the ETag; drop the conditional short-circuit if the helper is absent.

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run tests/api/etag.test.ts` (PASS), `npx vitest run` (all green), `npx nuxi typecheck` (exit 0).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add publish endpoint and version the public ETag by published_at"
```

---

## Task 12: Media upload endpoint

**Files:**
- Create: `server/api/admin/media.post.ts`
- Test: validation is covered by Task 8; this wires it. Add no new unit test (multipart handler).

- [ ] **Step 1: Implement**

`server/api/admin/media.post.ts`:
```ts
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from '../../db'
import { invitations, media } from '../../db/schema'
import { assertOwnerOr404 } from '../../utils/ownership'
import { validateMediaUpload, type MediaKind } from '../../utils/media-validate'
import { createR2Adapter } from '../../storage/r2'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const viewerId = session.user?.id ?? null
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, message: 'Expected multipart form data' })

  const get = (name: string) => parts.find((p) => p.name === name)
  const invId = get('invitationId')?.data?.toString()
  const kind = get('kind')?.data?.toString() as MediaKind | undefined
  const file = get('file')
  if (!invId || (kind !== 'image' && kind !== 'audio') || !file?.data) {
    throw createError({ statusCode: 400, message: 'Missing invitationId, kind, or file' })
  }

  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, invId)).limit(1)
  assertOwnerOr404(inv ?? null, viewerId)

  const result = validateMediaUpload({ kind, size: file.data.length, bytes: file.data })
  if (!result.ok) throw createError({ statusCode: 400, message: result.error })

  const cfg = useRuntimeConfig().r2 as any
  const adapter = createR2Adapter({
    accountId: cfg.accountId, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey,
    bucket: cfg.bucket, publicUrl: cfg.publicUrl,
  })
  const key = `invitations/${invId}/${kind}/${nanoid()}.${result.ext}`
  const { url } = await adapter.put(key, file.data, result.contentType)
  const [row] = await db.insert(media).values({ invitationId: invId, type: kind, r2Key: key, url, meta: {} }).returning({ id: media.id, url: media.url })
  return row
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxi typecheck` (exit 0).

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "feat: add server-proxied media upload endpoint with validation"
```

---

## Task 13: Editor store composable

**Files:**
- Create: `app/composables/useInvitationEditor.ts`
- Test: `tests/composables/useInvitationEditor.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useInvitationEditor.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createEditorState } from '../../app/composables/useInvitationEditor'

describe('createEditorState', () => {
  it('adds, toggles, moves, and removes sections', () => {
    const s = createEditorState({ sections: [] })
    s.addSection('hero')
    s.addSection('quote')
    expect(s.doc.sections.map((x) => x.type)).toEqual(['hero', 'quote'])

    const heroId = s.doc.sections[0].id
    s.toggle(heroId)
    expect(s.doc.sections[0].enabled).toBe(false)

    s.move(0, 1) // move hero down
    expect(s.doc.sections.map((x) => x.type)).toEqual(['quote', 'hero'])

    s.remove(heroId)
    expect(s.doc.sections.map((x) => x.type)).toEqual(['quote'])
  })
  it('setField updates nested content', () => {
    const s = createEditorState({ sections: [] })
    s.addSection('hero')
    const id = s.doc.sections[0].id
    s.setField(id, 'title', 'Halo')
    expect(s.doc.sections[0].content.title).toBe('Halo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useInvitationEditor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/composables/useInvitationEditor.ts`:
```ts
import { reactive } from 'vue'
import { nanoid } from 'nanoid'
import { defaultContent, type SectionType } from '../../server/registry/sections'
import type { InvitationDocument } from '../../server/document/types'

export function createEditorState(initial: InvitationDocument) {
  const doc = reactive<InvitationDocument>({ sections: [...(initial.sections ?? [])] })

  function addSection(type: SectionType) {
    doc.sections.push({ id: nanoid(), type, enabled: true, content: defaultContent(type) })
  }
  function remove(id: string) {
    const i = doc.sections.findIndex((s) => s.id === id)
    if (i >= 0) doc.sections.splice(i, 1)
  }
  function toggle(id: string) {
    const s = doc.sections.find((x) => x.id === id)
    if (s) s.enabled = !s.enabled
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= doc.sections.length) return
    const [s] = doc.sections.splice(from, 1)
    doc.sections.splice(to, 0, s)
  }
  function setField(id: string, key: string, value: unknown) {
    const s = doc.sections.find((x) => x.id === id)
    if (s) (s.content as any)[key] = value
  }
  return { doc, addSection, remove, toggle, move, setField }
}

// Nuxt composable wrapper (per-page singleton via useState would go here in the page).
export function useInvitationEditor(initial: InvitationDocument) {
  return createEditorState(initial)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useInvitationEditor.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add reactive invitation editor store with structural ops"
```

---

## Task 14: Autosave debounce

**Files:**
- Create: `app/composables/useAutosave.ts`
- Test: `tests/composables/useAutosave.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/composables/useAutosave.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { createDebouncer } from '../../app/composables/useAutosave'

describe('createDebouncer', () => {
  it('coalesces rapid calls into one after the delay', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = createDebouncer(fn, 1500)
    d.schedule(); d.schedule(); d.schedule()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('flush runs immediately and cancels the pending timer', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = createDebouncer(fn, 1500)
    d.schedule()
    d.flush()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1500)
    expect(fn).toHaveBeenCalledTimes(1) // not called again
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useAutosave.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/composables/useAutosave.ts`:
```ts
export function createDebouncer(fn: () => void, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; fn() }, delayMs)
  }
  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    fn()
  }
  function cancel() { if (timer) { clearTimeout(timer); timer = null } }
  return { schedule, flush, cancel }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useAutosave.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add autosave debouncer"
```

---

## Task 15: Field editor controls + FieldEditor dispatcher

**Files:**
- Create: `app/components/editor/controls/TextControl.vue`, `LongtextControl.vue`, `DateControl.vue`, `UrlControl.vue`, `YoutubeControl.vue`, `ImageControl.vue`, `ListControl.vue`, and `app/components/editor/FieldEditor.vue`
- Test: `tests/components/field-editor.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/field-editor.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldEditor from '../../app/components/editor/FieldEditor.vue'

describe('FieldEditor', () => {
  it('renders a text input for type text and emits update', async () => {
    const w = mount(FieldEditor, { props: { descriptor: { key: 'title', type: 'text', label: 'Judul' }, modelValue: 'A' } })
    const input = w.find('input')
    expect((input.element as HTMLInputElement).value).toBe('A')
    await input.setValue('B')
    expect(w.emitted('update:modelValue')![0]).toEqual(['B'])
  })
  it('renders a textarea for longtext', () => {
    const w = mount(FieldEditor, { props: { descriptor: { key: 'body', type: 'longtext', label: 'Isi' }, modelValue: '' } })
    expect(w.find('textarea').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/field-editor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the controls**

Each control is a thin `v-model` wrapper. `TextControl.vue`:
```vue
<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <input :value="modelValue" class="w-full rounded border p-2" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </label>
</template>
```

`LongtextControl.vue` (same but `<textarea>`):
```vue
<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <textarea :value="modelValue" rows="4" class="w-full rounded border p-2" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" />
  </label>
</template>
```

`DateControl.vue` (input type date/datetime-local):
```vue
<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <input type="datetime-local" :value="modelValue" class="w-full rounded border p-2" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </label>
</template>
```

`UrlControl.vue`:
```vue
<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <input type="url" placeholder="https://" :value="modelValue" class="w-full rounded border p-2" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </label>
</template>
```

`YoutubeControl.vue`:
```vue
<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <input placeholder="YouTube video ID" :value="modelValue" class="w-full rounded border p-2" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </label>
</template>
```

`ImageControl.vue` (stores a media id; opens MediaUploader — Task wires the uploader. For now it shows the current id and an upload slot):
```vue
<script setup lang="ts">
import MediaUploader from '../MediaUploader.vue'
defineProps<{ modelValue: string | null; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
function onUploaded(id: string) { emit('update:modelValue', id) }
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <p v-if="modelValue" class="mb-1 text-xs text-gray-500">media: {{ modelValue }}</p>
    <MediaUploader kind="image" @uploaded="onUploaded" />
  </div>
</template>
```

`ListControl.vue` (repeater of nested object items driven by `itemFields`):
```vue
<script setup lang="ts">
import { computed } from 'vue'
import FieldEditor from '../FieldEditor.vue'
import type { FieldEditorDescriptor } from '../../../utils/field-editors'

const props = defineProps<{ modelValue: any[]; label?: string; itemFields: Record<string, any> }>()
const emit = defineEmits<{ 'update:modelValue': [any[]] }>()

const itemEditors = computed<FieldEditorDescriptor[]>(() =>
  Object.entries(props.itemFields).map(([key, d]) => ({ key, ...(d as any) })))

function update(items: any[]) { emit('update:modelValue', items) }
function add() { update([...(props.modelValue ?? []), {}]) }
function removeAt(i: number) { const a = [...props.modelValue]; a.splice(i, 1); update(a) }
function setItemField(i: number, key: string, value: unknown) {
  const a = props.modelValue.map((x) => ({ ...x }))
  a[i][key] = value
  update(a)
}
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <div v-for="(item, i) in modelValue" :key="i" class="mb-3 rounded border p-3">
      <FieldEditor
        v-for="ed in itemEditors" :key="ed.key" :descriptor="ed"
        :model-value="item[ed.key]" @update:model-value="(v) => setItemField(i, ed.key, v)" />
      <button type="button" class="mt-2 text-xs text-red-600" @click="removeAt(i)">Hapus item</button>
    </div>
    <button type="button" class="rounded border px-2 py-1 text-xs" @click="add">+ Tambah</button>
  </div>
</template>
```

`FieldEditor.vue` (dispatch by descriptor.type):
```vue
<script setup lang="ts">
import { computed } from 'vue'
import TextControl from './controls/TextControl.vue'
import LongtextControl from './controls/LongtextControl.vue'
import DateControl from './controls/DateControl.vue'
import UrlControl from './controls/UrlControl.vue'
import YoutubeControl from './controls/YoutubeControl.vue'
import ImageControl from './controls/ImageControl.vue'
import ListControl from './controls/ListControl.vue'
import type { FieldEditorDescriptor } from '../../utils/field-editors'

const props = defineProps<{ descriptor: FieldEditorDescriptor; modelValue: any }>()
defineEmits<{ 'update:modelValue': [any] }>()

const control = computed(() => ({
  text: TextControl, longtext: LongtextControl, date: DateControl,
  url: UrlControl, youtube: YoutubeControl, image: ImageControl, list: ListControl,
} as Record<string, any>)[props.descriptor.type] ?? TextControl)
</script>
<template>
  <component
    :is="control" :label="descriptor.label" :model-value="modelValue"
    v-bind="descriptor.type === 'list' ? { itemFields: descriptor.itemFields } : {}"
    @update:model-value="$emit('update:modelValue', $event)" />
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/field-editor.test.ts`
Expected: PASS. (MediaUploader is imported by ImageControl; if the test mounts ImageControl indirectly, stub it. The FieldEditor test only mounts text/longtext, so MediaUploader isn't instantiated.)

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add field editor controls and type dispatcher"
```

---

## Task 16: MediaUploader component

**Files:**
- Create: `app/components/editor/MediaUploader.vue`
- Test: `tests/components/media-uploader.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/media-uploader.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MediaUploader from '../../app/components/editor/MediaUploader.vue'

describe('MediaUploader', () => {
  it('renders a file input scoped to the kind', () => {
    const w = mount(MediaUploader, { props: { kind: 'image' } })
    const input = w.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toContain('image')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/media-uploader.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/components/editor/MediaUploader.vue`:
```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
const props = defineProps<{ kind: 'image' | 'audio' }>()
const emit = defineEmits<{ uploaded: [string] }>()
const busy = ref(false)
const error = ref('')
const invitationId = inject<string>('invitationId', '')

const accept = props.kind === 'image' ? 'image/png,image/jpeg,image/webp' : 'audio/mpeg'

async function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const form = new FormData()
    form.append('invitationId', invitationId)
    form.append('kind', props.kind)
    form.append('file', file)
    const res = await $fetch<{ id: string; url: string }>('/api/admin/media', { method: 'POST', body: form })
    emit('uploaded', res.id)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Upload gagal'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div>
    <input type="file" :accept="accept" :disabled="busy" @change="onChange" />
    <span v-if="busy" class="text-xs text-gray-500">Mengunggah…</span>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>
```
The editor page provides `invitationId` via `provide('invitationId', id)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/media-uploader.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add media uploader component"
```

---

## Task 17: SectionEditor + SectionList panel

**Files:**
- Create: `app/components/editor/SectionEditor.vue`, `app/components/editor/SectionList.vue`
- Test: `tests/components/section-editor.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/section-editor.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionEditor from '../../app/components/editor/SectionEditor.vue'

describe('SectionEditor', () => {
  it('renders a field editor per registry field and emits content updates', async () => {
    const section = { id: 'a', type: 'hero', enabled: true, content: { title: 'X', coupleName: '', date: '' } }
    const w = mount(SectionEditor, { props: { section } })
    // hero has 3 fields -> at least 3 labelled controls
    expect(w.findAll('input').length).toBeGreaterThanOrEqual(3)
    const first = w.find('input')
    await first.setValue('Y')
    expect(w.emitted('set-field')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/section-editor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/components/editor/SectionEditor.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import FieldEditor from './FieldEditor.vue'
import { deriveFieldEditors } from '../../utils/field-editors'
import type { SectionType } from '../../../server/registry/sections'

const props = defineProps<{ section: { id: string; type: string; enabled: boolean; content: any } }>()
const emit = defineEmits<{ 'set-field': [{ id: string; key: string; value: unknown }] }>()
const editors = computed(() => deriveFieldEditors(props.section.type as SectionType))
</script>
<template>
  <div class="space-y-3">
    <FieldEditor
      v-for="ed in editors" :key="ed.key" :descriptor="ed"
      :model-value="section.content[ed.key]"
      @update:model-value="(v) => emit('set-field', { id: section.id, key: ed.key, value: v })" />
  </div>
</template>
```

`app/components/editor/SectionList.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import SectionEditor from './SectionEditor.vue'
import { SECTION_TYPES, sectionRegistry, type SectionType } from '../../../server/registry/sections'

const props = defineProps<{ sections: Array<{ id: string; type: string; enabled: boolean; content: any }> }>()
const emit = defineEmits<{
  add: [SectionType]; remove: [string]; toggle: [string]; move: [{ from: number; to: number }]
  'set-field': [{ id: string; key: string; value: unknown }]
}>()
const openId = ref<string | null>(null)
const types = SECTION_TYPES
function label(t: string) { return (sectionRegistry as any)[t]?.label ?? t }
</script>
<template>
  <div class="space-y-2">
    <div v-for="(s, i) in sections" :key="s.id" class="rounded border">
      <div class="flex items-center gap-2 p-2">
        <button type="button" class="text-xs" @click="openId = openId === s.id ? null : s.id">{{ label(s.type) }}</button>
        <span class="ml-auto flex gap-1">
          <button type="button" class="text-xs" :disabled="i === 0" @click="emit('move', { from: i, to: i - 1 })">↑</button>
          <button type="button" class="text-xs" :disabled="i === sections.length - 1" @click="emit('move', { from: i, to: i + 1 })">↓</button>
          <label class="text-xs"><input type="checkbox" :checked="s.enabled" @change="emit('toggle', s.id)" /> aktif</label>
          <button type="button" class="text-xs text-red-600" @click="emit('remove', s.id)">hapus</button>
        </span>
      </div>
      <div v-if="openId === s.id" class="border-t p-3">
        <SectionEditor :section="s" @set-field="(p) => emit('set-field', p)" />
      </div>
    </div>
    <div class="flex flex-wrap gap-1 pt-2">
      <button v-for="t in types" :key="t" type="button" class="rounded border px-2 py-1 text-xs" @click="emit('add', t as SectionType)">+ {{ label(t) }}</button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/section-editor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add section editor and section list panel"
```

---

## Task 18: EditorPreview (containment + mobile/desktop + cover toggle)

**Files:**
- Create: `app/components/editor/EditorPreview.vue`
- Test: `tests/components/editor-preview.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/editor-preview.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorPreview from '../../app/components/editor/EditorPreview.vue'

const doc = { sections: [{ id: 'a', type: 'hero', enabled: true, content: { title: 'The Wedding Of', coupleName: 'W & D', date: '' } }] }

describe('EditorPreview', () => {
  it('applies containment style and renders enabled sections', () => {
    const w = mount(EditorPreview, { props: { sections: doc.sections, cssVars: { '--color-primary': '#abc' }, device: 'desktop', showCover: false } })
    expect(w.attributes('style')).toContain('--color-primary: #abc')
    const frame = w.find('[data-preview-frame]')
    expect(frame.attributes('style')).toMatch(/transform|contain/)
    expect(w.findAllComponents({ name: 'SectionRenderer' }).length).toBe(1)
  })
  it('constrains width in mobile mode', () => {
    const w = mount(EditorPreview, { props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: false } })
    expect(w.find('[data-preview-frame]').attributes('style')).toContain('390px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/editor-preview.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/components/editor/EditorPreview.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import SectionRenderer from '../invitation/SectionRenderer.vue'

const props = defineProps<{
  sections: Array<{ id: string; type: string; enabled: boolean; content: any }>
  cssVars: Record<string, string>
  device: 'mobile' | 'desktop'
  showCover: boolean
}>()

const rootStyle = computed(() => Object.entries(props.cssVars).map(([k, v]) => `${k}: ${v}`).join('; '))
// transform/contain makes position:fixed descendants (cover, music) resolve to this frame, not the viewport
const frameStyle = computed(() => {
  const containment = 'transform: translateZ(0); contain: layout paint; overflow: auto; position: relative;'
  const width = props.device === 'mobile' ? 'width: 390px;' : 'width: 100%;'
  return `${containment} ${width}`
})
const visible = computed(() => props.sections.filter((s) => s.enabled))
</script>
<template>
  <div class="invitation" :style="rootStyle">
    <div data-preview-frame class="mx-auto h-full border bg-white" :style="frameStyle">
      <SectionRenderer v-for="s in visible" :key="s.id" :section="s" />
    </div>
  </div>
</template>
```
(The `showCover` prop is reserved for a cover-preview toggle; Phase 2a renders content by default. Rendering the cover is optional polish — keep the prop wired so the editor page can pass it, but the default content view satisfies the spec.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/editor-preview.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: add editor preview with fixed-containment and device toggle"
```

---

## Task 19: SaveStatus + editor page wiring

**Files:**
- Create: `app/components/editor/SaveStatus.vue`, `app/pages/admin/invitations/[id]/edit.vue`
- Test: `tests/components/save-status.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/components/save-status.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaveStatus from '../../app/components/editor/SaveStatus.vue'

describe('SaveStatus', () => {
  it('shows saving / saved / error text by state', () => {
    expect(mount(SaveStatus, { props: { state: 'saving' } }).text()).toMatch(/Menyimpan/)
    expect(mount(SaveStatus, { props: { state: 'saved' } }).text()).toMatch(/Tersimpan/)
    expect(mount(SaveStatus, { props: { state: 'error' } }).text()).toMatch(/Gagal/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/save-status.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement SaveStatus + page**

`app/components/editor/SaveStatus.vue`:
```vue
<script setup lang="ts">
defineProps<{ state: 'idle' | 'saving' | 'saved' | 'error' }>()
const text: Record<string, string> = { idle: '', saving: 'Menyimpan…', saved: 'Tersimpan', error: 'Gagal menyimpan' }
</script>
<template>
  <span class="text-xs" :class="state === 'error' ? 'text-red-600' : 'text-gray-500'">{{ text[state] }}</span>
</template>
```

`app/pages/admin/invitations/[id]/edit.vue`:
```vue
<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import { createEditorState } from '~/composables/useInvitationEditor'
import { createDebouncer } from '~/composables/useAutosave'
import SectionList from '~/components/editor/SectionList.vue'
import EditorPreview from '~/components/editor/EditorPreview.vue'
import SaveStatus from '~/components/editor/SaveStatus.vue'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string
provide('invitationId', id)

const { data } = await useFetch(`/api/admin/invitations/${id}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Tidak ditemukan' })

const editor = createEditorState((data.value as any).draftDocument ?? { sections: [] })
const device = ref<'mobile' | 'desktop'>('mobile')
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

// theme css vars resolved server-side in the GET endpoint so the preview shows the real theme
const cssVars = ((data.value as any).cssVars ?? {}) as Record<string, string>

async function save() {
  saveState.value = 'saving'
  try {
    await $fetch(`/api/admin/invitations/${id}/draft`, { method: 'PATCH', body: { document: editor.doc } })
    saveState.value = 'saved'
  } catch { saveState.value = 'error' }
}
const debouncer = createDebouncer(save, 1500)
watch(() => editor.doc, () => { saveState.value = 'saving'; debouncer.schedule() }, { deep: true })

const publishing = ref(false)
async function publish() {
  publishing.value = true
  try { debouncer.flush(); await $fetch(`/api/admin/invitations/${id}/publish`, { method: 'POST' }) }
  finally { publishing.value = false }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold">Editor</h1>
        <SaveStatus :state="saveState" class="ml-2" />
        <button class="ml-auto rounded bg-black px-3 py-1 text-sm text-white" :disabled="publishing" @click="publish">Publish</button>
      </div>
      <SectionList
        :sections="editor.doc.sections"
        @add="editor.addSection"
        @remove="editor.remove"
        @toggle="editor.toggle"
        @move="(p) => editor.move(p.from, p.to)"
        @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
    </div>
    <div>
      <div class="mb-2 flex gap-2">
        <button class="rounded border px-2 py-1 text-xs" :class="{ 'bg-gray-200': device === 'mobile' }" @click="device = 'mobile'">Mobile</button>
        <button class="rounded border px-2 py-1 text-xs" :class="{ 'bg-gray-200': device === 'desktop' }" @click="device = 'desktop'">Desktop</button>
      </div>
      <EditorPreview :sections="editor.doc.sections" :css-vars="cssVars" :device="device" :show-cover="false" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes + typecheck**

Run: `npx vitest run tests/components/save-status.test.ts` (PASS), `npx nuxi typecheck` (exit 0).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: wire editor page (panel + preview + autosave + publish)"
```

---

## Task 20: Admin invitations list + create page

**Files:**
- Create: `app/pages/admin/invitations/index.vue`

- [ ] **Step 1: Implement**

`app/pages/admin/invitations/index.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
definePageMeta({ middleware: 'admin' })

const { data: list, refresh } = await useFetch('/api/admin/invitations')
const title = ref('')
const type = ref<'wedding' | 'metatah' | 'wedding_metatah' | 'baby_3mo' | 'birthday'>('wedding')
const creating = ref(false)
const error = ref('')

async function create() {
  error.value = ''
  creating.value = true
  try {
    const inv = await $fetch<{ id: string }>('/api/admin/invitations', { method: 'POST', body: { title: title.value, type: type.value } })
    await navigateTo(`/admin/invitations/${inv.id}/edit`)
  } catch (e: any) { error.value = e?.data?.message ?? 'Gagal' } finally { creating.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-6">
    <h1 class="mb-4 text-xl font-semibold">Undangan Saya</h1>
    <form class="mb-6 flex gap-2" @submit.prevent="create">
      <input v-model="title" placeholder="Judul undangan" class="flex-1 rounded border p-2" required />
      <select v-model="type" class="rounded border p-2">
        <option value="wedding">Pernikahan</option>
        <option value="wedding_metatah">Pernikahan + Metatah</option>
        <option value="metatah">Metatah</option>
        <option value="baby_3mo">3 Bulanan</option>
        <option value="birthday">Ulang Tahun</option>
      </select>
      <button type="submit" :disabled="creating" class="rounded bg-black px-3 text-white">Buat</button>
    </form>
    <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
    <ul class="space-y-2">
      <li v-for="inv in (list as any[])" :key="inv.id" class="flex items-center gap-2 rounded border p-3">
        <span>{{ inv.slug }}</span>
        <span class="text-xs text-gray-500">{{ inv.status }}</span>
        <NuxtLink :to="`/admin/invitations/${inv.id}/edit`" class="ml-auto text-sm text-blue-600">Edit</NuxtLink>
      </li>
    </ul>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxi typecheck` (exit 0).

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "feat: add admin invitations list + create page"
```

---

## Task 21: Full-suite verification

- [ ] **Step 1: Run the whole suite**

Run: `npx vitest run`
Expected: all specs pass (Phase 0+1 adapted tests + new Phase 2a: validate, publish, field-descriptors, field-editors, ownership, media-validate, slug, etag, useInvitationEditor, useAutosave, field-editor, media-uploader, section-editor, editor-preview, save-status).

- [ ] **Step 2: Typecheck**

Run: `npx nuxi prepare && npx nuxi typecheck`
Expected: exit 0.

- [ ] **Step 3: Manual smoke (requires a live DB + R2) — document, do not block on it**

With `.env` configured and `npm run db:migrate && npm run db:seed`:
1. Log in as demo@lovree.com / password123 → `/admin/invitations` lists `demo-wedding`.
2. Open the editor → edit Hero title → preview updates instantly; cover/music stay inside the preview frame; Mobile/Desktop toggle resizes.
3. Upload an image (≤2MB) into a gallery item; a >2MB or non-image file is rejected.
4. Add a second gallery, toggle a section off, reorder; preview reflects each change.
5. Save status cycles "Menyimpan…/Tersimpan"; reload restores the draft.
6. Publish → open `/u/demo-wedding` in another tab → published changes appear; an un-published draft edit does not change the public page until the next publish.
7. As a different account, `PATCH /api/admin/invitations/<that id>/draft` → 404.

- [ ] **Step 4: Commit (if fixes were needed)**
```bash
git add -A
git commit -m "test: verify Phase 2a suite and editor flow"
```

---

## Success Criteria Checklist (from spec §10)

- [ ] 1. Create invitation (type + theme) → editor with empty draft (Tasks 9, 19, 20).
- [ ] 2. Editing preset fields updates the live preview instantly; cover/music contained in the pane; mobile/desktop toggle works (Tasks 15, 17, 18, 19).
- [ ] 3. Image (≤2MB jpg/png/webp) + audio (≤5MB mp3) upload to R2; oversized/wrong-type rejected via magic-byte sniff (Tasks 8, 12, 16).
- [ ] 4. Add (incl. repeats), remove, toggle, reorder sections reflected in preview (Tasks 13, 17).
- [ ] 5. Edits autosave (debounced) with visible status; reload restores draft (Tasks 10, 14, 19).
- [ ] 6. Publish copies draft→published; public `/u/:slug` reflects it (ETag keyed on published_at); further draft edits don't change public view until next publish (Tasks 11).
- [ ] 7. Non-owner mutation → 404 (Tasks 7, 9–12).
- [ ] 8. Public renderer works end-to-end against published_document, migrated from the sections table (Tasks 1, 4, 5).

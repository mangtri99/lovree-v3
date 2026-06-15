# Package E — Invitation Words + Create Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A global Invitation Word library (CRUD via a sidebar menu) and a modal create-invitation form requiring title, slug, type, theme, and a chosen Invitation Word whose copy seeds the new invitation.

**Architecture:** New `invitation_words` table (global). `starterDocument(type, word)` overrides opening/closing/quote from the word's non-empty fields. CRUD endpoints + an admin page manage words; the create endpoint requires a unique slug + a word id and seeds from it; the create form becomes a modal.

**Tech Stack:** Nuxt 4 (Nitro), Drizzle ORM + Neon, Zod, Vitest, Nuxt UI v4.

**Branch:** `feat/phase-2b-media`. Migration `0007`. Dev DB disposable.

**Grounding facts:**
- `starterDocument(type)` (server/registry/starter-sections.ts): builds sections from `STARTER_CONFIG[type]` via `validateContent(t, cfg.content?.[t] ?? {})`. Closing now has `{greeting, body}`; quote has `{text, source}`; opening `{greeting, body}` (Package A).
- Create endpoint `server/api/admin/invitations/index.post.ts`: body `{title, type, themeId?}`, auto slug `slugify(title, nanoid(6))`, seeds `starterDocument(type)`. `slugify(input, suffix?)` in `server/utils/slug.ts` lowercases/hyphenates (`||'undangan'`).
- `themes` table; `GET /api/admin/themes` returns `{id,name,tokens,previewImage,key}`.
- Sidebar `app/layouts/admin.vue` `links`: Dashboard, Undangan, Musik.
- `app/pages/admin/invitations/index.vue` has the inline create form (title/type/theme) + the invitations list. The theme list + `themeItems` are already loaded there.
- Cross-boundary import of server utils into app pages is established (`~~/server/...`).
- Type enum: `'wedding' | 'metatah' | 'wedding_metatah' | 'baby_3mo' | 'birthday'`.

---

## File Structure

- Modify `server/db/schema.ts` — `invitationWords` table; migration 0007.
- Modify `server/registry/starter-sections.ts` — `wordToContent` + `starterDocument(type, word?)`.
- Create `server/api/admin/invitation-words/index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`.
- Modify `server/api/admin/invitations/index.post.ts` — required slug+themeId+invitationWordId, unique slug, seed from word.
- Modify `app/pages/admin/invitations/index.vue` — create modal.
- Create `app/pages/admin/invitation-words.vue`; modify `app/layouts/admin.vue` — nav.
- Modify `server/db/seed.ts` — seed default words.
- Tests: `tests/registry/starter-sections.test.ts` (extend), unit/typecheck for endpoints, UI by typecheck.

---

## Task 1: Schema — `invitation_words` (migration 0007)

**Files:** Modify `server/db/schema.ts`; generated `server/db/migrations/0007_*.sql`.

- [ ] **Step 1: Add the table** (near the other tables, after `themes` is fine):
```ts
export const invitationWords = pgTable('invitation_words', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  openingGreeting: text('opening_greeting').notNull().default(''),
  openingBody: text('opening_body').notNull().default(''),
  closingGreeting: text('closing_greeting').notNull().default(''),
  closingBody: text('closing_body').notNull().default(''),
  quote: text('quote').notNull().default(''),
  quoteSource: text('quote_source').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate` → `server/db/migrations/0007_*.sql` (CREATE TABLE invitation_words). Confirm `ls server/db/migrations/0007_*.sql`. If it prompts non-TTY, hand-write the `CREATE TABLE "invitation_words" (...)` migration + meta mirroring the prior ones. Do NOT run `db:migrate`.

- [ ] **Step 3: Typecheck** — `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0).

- [ ] **Step 4: Commit**

```bash
git add server/db/schema.ts server/db/migrations/
git commit -m "feat: invitation_words table (migration 0007)"
```

---

## Task 2: `wordToContent` + `starterDocument(type, word)`

**Files:** Modify `server/registry/starter-sections.ts`; Test `tests/registry/starter-sections.test.ts`.

- [ ] **Step 1: Write the failing test** (append to `tests/registry/starter-sections.test.ts`):
```ts
import { wordToContent } from '../../server/registry/starter-sections'

const WORD = { openingGreeting: 'Halo', openingBody: 'Isi pembuka', closingGreeting: 'Salam', closingBody: 'Isi penutup', quote: 'Kutipan', quoteSource: 'Sumber' }

describe('wordToContent', () => {
  it('maps non-empty fields, omits empty', () => {
    expect(wordToContent(WORD)).toEqual({
      opening: { greeting: 'Halo', body: 'Isi pembuka' },
      closing: { greeting: 'Salam', body: 'Isi penutup' },
      quote: { text: 'Kutipan', source: 'Sumber' },
    })
    expect(wordToContent({ openingGreeting: 'Hi' })).toEqual({ opening: { greeting: 'Hi' }, closing: {}, quote: {} })
  })
})

describe('starterDocument with a word', () => {
  it('seeds opening/closing/quote from the word', () => {
    const doc = starterDocument('wedding', WORD)
    const opening = doc.sections.find((s) => s.type === 'opening')!.content
    const closing = doc.sections.find((s) => s.type === 'closing')!.content
    const quote = doc.sections.find((s) => s.type === 'quote')!.content
    expect(opening.greeting).toBe('Halo'); expect(opening.body).toBe('Isi pembuka')
    expect(closing.greeting).toBe('Salam'); expect(closing.body).toBe('Isi penutup')
    expect(quote.text).toBe('Kutipan'); expect(quote.source).toBe('Sumber')
  })
  it('keeps the type default for empty word fields', () => {
    const def = starterDocument('wedding').sections.find((s) => s.type === 'opening')!.content
    const seeded = starterDocument('wedding', { openingBody: '' }).sections.find((s) => s.type === 'opening')!.content
    expect(seeded.greeting).toBe(def.greeting)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/registry/starter-sections.test.ts -t "wordToContent"`

- [ ] **Step 3: Implement** in `server/registry/starter-sections.ts`:
```ts
export interface InvitationWordContent {
  openingGreeting?: string; openingBody?: string
  closingGreeting?: string; closingBody?: string
  quote?: string; quoteSource?: string
}

export function wordToContent(word: InvitationWordContent): Partial<Record<SectionType, Record<string, any>>> {
  const opening: Record<string, any> = {}
  if (word.openingGreeting) opening.greeting = word.openingGreeting
  if (word.openingBody) opening.body = word.openingBody
  const closing: Record<string, any> = {}
  if (word.closingGreeting) closing.greeting = word.closingGreeting
  if (word.closingBody) closing.body = word.closingBody
  const quote: Record<string, any> = {}
  if (word.quote) quote.text = word.quote
  if (word.quoteSource) quote.source = word.quoteSource
  return { opening, closing, quote }
}
```
Update `starterDocument` to accept an optional word:
```ts
export function starterDocument(type: string, word?: InvitationWordContent | null): InvitationDocument {
  const cfg = STARTER_CONFIG[type] ?? STARTER_CONFIG.wedding!
  const wo = word ? wordToContent(word) : {}
  return {
    sections: cfg.sections.map((t) => ({
      id: nanoid(),
      type: t,
      enabled: true,
      content: validateContent(t, { ...(cfg.content?.[t] ?? {}), ...((wo as any)[t] ?? {}) }),
    })),
  }
}
```

- [ ] **Step 4: Run, confirm PASS** — `npx vitest run tests/registry/starter-sections.test.ts`

- [ ] **Step 5: Commit**

```bash
git add server/registry/starter-sections.ts tests/registry/starter-sections.test.ts
git commit -m "feat: starterDocument seeds opening/closing/quote from an invitation word"
```

---

## Task 3: Invitation-word CRUD endpoints

**Files:** Create `server/api/admin/invitation-words/index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`. Test: none new (auth-guarded thin shell; typecheck).

- [ ] **Step 1: GET**

`server/api/admin/invitation-words/index.get.ts`:
```ts
import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const type = getQuery(event).type as string | undefined
  const base = db.select().from(invitationWords)
  const rows = type
    ? await base.where(eq(invitationWords.type, type)).orderBy(desc(invitationWords.createdAt))
    : await base.orderBy(desc(invitationWords.createdAt))
  return { words: rows }
})
```

- [ ] **Step 2: POST**

`server/api/admin/invitation-words/index.post.ts`:
```ts
import { z } from 'zod'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

const body = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']),
  openingGreeting: z.string().max(2000).default(''),
  openingBody: z.string().max(2000).default(''),
  closingGreeting: z.string().max(2000).default(''),
  closingBody: z.string().max(2000).default(''),
  quote: z.string().max(2000).default(''),
  quoteSource: z.string().max(2000).default(''),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()
  const [row] = await db.insert(invitationWords).values(parsed.data).returning()
  return row
})
```

- [ ] **Step 3: PATCH**

`server/api/admin/invitation-words/[id].patch.ts`:
```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

const body = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']).optional(),
  openingGreeting: z.string().max(2000).optional(),
  openingBody: z.string().max(2000).optional(),
  closingGreeting: z.string().max(2000).optional(),
  closingBody: z.string().max(2000).optional(),
  quote: z.string().max(2000).optional(),
  quoteSource: z.string().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()
  const [existing] = await db.select({ id: invitationWords.id }).from(invitationWords).where(eq(invitationWords.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(invitationWords).set(parsed.data).where(eq(invitationWords.id, id))
  return { ok: true }
})
```

- [ ] **Step 4: DELETE**

`server/api/admin/invitation-words/[id].delete.ts`:
```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitationWords } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const [existing] = await db.select({ id: invitationWords.id }).from(invitationWords).where(eq(invitationWords.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })
  await db.delete(invitationWords).where(eq(invitationWords.id, id))
  return { ok: true }
})
```

- [ ] **Step 5: Typecheck + commit**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0).
```bash
git add "server/api/admin/invitation-words"
git commit -m "feat: invitation-words CRUD endpoints (global, auth-guarded)"
```

---

## Task 4: Create-invitation endpoint — required slug + word seeding

**Files:** Modify `server/api/admin/invitations/index.post.ts`.

- [ ] **Step 1: Rewrite the endpoint**

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, themes, invitationWords } from '../../../db/schema'
import { slugify } from '../../../utils/slug'
import { starterDocument } from '../../../registry/starter-sections'

const body = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['wedding', 'metatah', 'wedding_metatah', 'baby_3mo', 'birthday']),
  themeId: z.string().uuid(),
  invitationWordId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const db = useDb()

  const slug = slugify(parsed.data.slug)
  if (!slug) throw createError({ statusCode: 400, message: 'Slug tidak valid' })
  const [taken] = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.slug, slug)).limit(1)
  if (taken) throw createError({ statusCode: 409, message: 'Slug sudah dipakai' })

  const [theme] = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, parsed.data.themeId)).limit(1)
  if (!theme) throw createError({ statusCode: 400, message: 'Tema tidak valid' })

  const [word] = await db.select().from(invitationWords).where(eq(invitationWords.id, parsed.data.invitationWordId)).limit(1)
  if (!word) throw createError({ statusCode: 400, message: 'Template konten tidak valid' })

  const [inv] = await db.insert(invitations).values({
    ownerId, slug, type: parsed.data.type, themeId: parsed.data.themeId,
    status: 'draft', draftDocument: starterDocument(parsed.data.type, word),
  }).returning({ id: invitations.id, slug: invitations.slug })
  return inv
})
```

- [ ] **Step 2: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0).
Run: `npx vitest run` (all pass).

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/invitations/index.post.ts
git commit -m "feat: create invitation requires unique slug + theme + word, seeds from word"
```

---

## Task 5: Create form modal

**Files:** Modify `app/pages/admin/invitations/index.vue`.

- [ ] **Step 1: Rewrite the page** (keeps the list; replaces the inline form with a modal):
```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { slugify } from '~~/server/utils/slug'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: list, refresh } = await useFetch('/api/admin/invitations')
const { data: themes } = await useFetch<any>('/api/admin/themes')
const themeItems = computed(() => ((themes.value as any[]) ?? []).map((t) => ({ label: t.name, value: t.id })))

const open = ref(false)
const title = ref('')
const slug = ref('')
const slugTouched = ref(false)
const type = ref<'wedding' | 'metatah' | 'wedding_metatah' | 'baby_3mo' | 'birthday'>('wedding')
const themeId = ref('')
const wordId = ref('')
const creating = ref(false)
const error = ref('')

const typeItems = [
  { label: 'Pernikahan', value: 'wedding' },
  { label: 'Pernikahan + Metatah', value: 'wedding_metatah' },
  { label: 'Metatah', value: 'metatah' },
  { label: '3 Bulanan', value: 'baby_3mo' },
  { label: 'Ulang Tahun', value: 'birthday' },
]

// Words filtered by the chosen type (re-fetched on type change).
const { data: words } = await useFetch<any>('/api/admin/invitation-words', { query: { type } })
const wordItems = computed(() => ((words.value as any)?.words ?? []).map((w: any) => ({ label: w.name, value: w.id })))

// Auto-suggest slug from title until the user edits it.
watch(title, (t) => { if (!slugTouched.value) slug.value = slugify(t) })
watch(type, () => { wordId.value = '' })

const valid = computed(() => !!(title.value.trim() && slug.value.trim() && type.value && themeId.value && wordId.value))

function openModal() {
  open.value = true
  if (!themeId.value && (themes.value as any[])?.length) themeId.value = (themes.value as any[])[0].id
}
async function create() {
  if (!valid.value || creating.value) return
  error.value = ''; creating.value = true
  try {
    const inv = await $fetch<{ id: string }>('/api/admin/invitations', { method: 'POST', body: { title: title.value, slug: slug.value, type: type.value, themeId: themeId.value, invitationWordId: wordId.value } })
    await navigateTo(`/admin/invitations/${inv.id}/edit`)
  } catch (e: any) { error.value = e?.data?.message ?? 'Gagal' } finally { creating.value = false }
}
</script>

<template>
  <UDashboardPanel id="invitations">
    <template #header>
      <UDashboardNavbar title="Undangan Saya">
        <template #right>
          <UButton icon="i-lucide-plus" label="Buat Undangan" @click="openModal" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-2">
        <div v-if="!(list as any[])?.length" class="text-sm text-muted">Belum ada undangan.</div>
        <UCard v-for="inv in (list as any[])" :key="inv.id">
          <div class="flex items-center gap-2">
            <span>{{ inv.slug }}</span>
            <UBadge :color="inv.status === 'published' ? 'success' : 'neutral'" variant="subtle" :label="inv.status" />
            <UButton v-if="inv.status === 'published'" class="ml-auto" variant="link" icon="i-lucide-external-link" :to="`/u/${inv.slug}`" target="_blank" label="View" />
            <UButton :class="inv.status === 'published' ? '' : 'ml-auto'" variant="link" :to="`/admin/invitations/${inv.id}/edit`" label="Edit" />
            <UButton variant="link" :to="`/admin/invitations/${inv.id}/guests`" label="Tamu" />
            <UButton variant="link" :to="`/admin/invitations/${inv.id}/rsvp`" label="RSVP" />
          </div>
        </UCard>
      </div>

      <UModal v-model:open="open" title="Buat Undangan">
        <template #body>
          <div class="space-y-3">
            <UFormField label="Judul" required>
              <UInput v-model="title" placeholder="Judul undangan" class="w-full" />
            </UFormField>
            <UFormField label="Slug" required help="slug akan digunakan sebagai url undangan">
              <UInput v-model="slug" class="w-full" @update:model-value="slugTouched = true" />
            </UFormField>
            <UFormField label="Tipe" required>
              <USelect v-model="type" :items="typeItems" class="w-full" />
            </UFormField>
            <UFormField label="Tema" required>
              <USelect v-model="themeId" :items="themeItems" class="w-full" />
            </UFormField>
            <UFormField label="Template Konten" required>
              <USelect v-model="wordId" :items="wordItems" placeholder="Pilih kata-kata" class="w-full" />
            </UFormField>
            <p v-if="error" class="text-sm text-error">{{ error }}</p>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" label="Batal" @click="open = false" />
              <UButton label="Buat" :loading="creating" :disabled="!valid" @click="create" />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0). If the `~~/server/utils/slug` import errs, use the relative path `../../../../server/utils/slug` from this page, or inline a small slugify. Verify before commit.
Run: `npx vitest run` (all pass).

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/invitations/index.vue
git commit -m "feat: create-invitation modal (title/slug/type/theme/word, all required)"
```

---

## Task 6: Invitation Word admin page + nav

**Files:** Create `app/pages/admin/invitation-words.vue`; modify `app/layouts/admin.vue`.

- [ ] **Step 1: Nav item**

In `app/layouts/admin.vue` `links`, add after Musik:
```ts
    { label: 'Invitation Word', icon: 'i-lucide-book-text', to: '/admin/invitation-words' },
```

- [ ] **Step 2: Create the page**

`app/pages/admin/invitation-words.vue`:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch<any>('/api/admin/invitation-words')
const words = computed<any[]>(() => (data.value as any)?.words ?? [])
const typeItems = [
  { label: 'Pernikahan', value: 'wedding' },
  { label: 'Pernikahan + Metatah', value: 'wedding_metatah' },
  { label: 'Metatah', value: 'metatah' },
  { label: '3 Bulanan', value: 'baby_3mo' },
  { label: 'Ulang Tahun', value: 'birthday' },
]

const blank = () => ({ id: '', name: '', type: 'wedding', openingGreeting: '', openingBody: '', closingGreeting: '', closingBody: '', quote: '', quoteSource: '' })
const open = ref(false)
const form = ref<any>(blank())
const saving = ref(false)

function add() { form.value = blank(); open.value = true }
function edit(w: any) { form.value = { ...w }; open.value = true }
async function save() {
  saving.value = true
  try {
    const { id, ...payload } = form.value
    if (id) await $fetch(`/api/admin/invitation-words/${id}`, { method: 'PATCH', body: payload })
    else await $fetch('/api/admin/invitation-words', { method: 'POST', body: payload })
    open.value = false
    await refresh()
  } finally { saving.value = false }
}
async function del(id: string) {
  await $fetch(`/api/admin/invitation-words/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="invitation-words">
    <template #header>
      <UDashboardNavbar title="Invitation Word">
        <template #right><UButton icon="i-lucide-plus" label="Tambah" @click="add" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-2">
        <div v-if="!words.length" class="text-sm text-muted">Belum ada kata-kata. Tambah satu untuk dipakai saat buat undangan.</div>
        <UCard v-for="w in words" :key="w.id">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ w.name }}</span>
            <UBadge variant="subtle" :label="w.type" />
            <UButton class="ml-auto" size="xs" variant="ghost" label="Edit" @click="edit(w)" />
            <UButton size="xs" color="error" variant="ghost" label="Hapus" @click="del(w.id)" />
          </div>
        </UCard>
      </div>

      <UModal v-model:open="open" :title="form.id ? 'Edit Kata-kata' : 'Tambah Kata-kata'">
        <template #body>
          <div class="space-y-3">
            <UFormField label="Judul" required><UInput v-model="form.name" class="w-full" /></UFormField>
            <UFormField label="Tipe Undangan" required><USelect v-model="form.type" :items="typeItems" class="w-full" /></UFormField>
            <UFormField label="Salam Pembuka"><UInput v-model="form.openingGreeting" class="w-full" /></UFormField>
            <UFormField label="Isi Pembuka"><UTextarea v-model="form.openingBody" :rows="3" class="w-full" /></UFormField>
            <UFormField label="Isi Penutup"><UTextarea v-model="form.closingBody" :rows="3" class="w-full" /></UFormField>
            <UFormField label="Salam Penutup"><UInput v-model="form.closingGreeting" class="w-full" /></UFormField>
            <UFormField label="Quote"><UTextarea v-model="form.quote" :rows="2" class="w-full" /></UFormField>
            <UFormField label="Sumber Quote"><UInput v-model="form.quoteSource" class="w-full" /></UFormField>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" label="Batal" @click="open = false" />
              <UButton label="Simpan" :loading="saving" :disabled="!form.name.trim()" @click="save" />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 3: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0).
Run: `npx vitest run` (all pass).

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/invitation-words.vue app/layouts/admin.vue
git commit -m "feat: Invitation Word admin page (CRUD) + sidebar nav"
```

---

## Task 7: Seed defaults + verification gate

**Files:** Modify `server/db/seed.ts`.

- [ ] **Step 1: Seed default words**

In `server/db/seed.ts`, add `invitationWords` to the schema import, and after the themes insert, insert a few default words (at least one per type):
```ts
  await db.insert(invitationWords).values([
    { name: 'Pernikahan — Klasik', type: 'wedding', openingGreeting: 'Om Swastiastu', openingBody: 'Dengan penuh suka cita kami mengundang Bapak/Ibu/Saudara/i pada hari bahagia pernikahan kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.', quote: 'Cinta sejati tidak pernah berakhir.', quoteSource: 'QS Ar-Rum: 21' },
    { name: 'Metatah — Klasik', type: 'metatah', openingGreeting: 'Om Swastiastu', openingBody: 'Kami mengundang Bapak/Ibu/Saudara/i pada upacara Metatah putra/putri kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.', quote: '', quoteSource: '' },
    { name: '3 Bulanan — Klasik', type: 'baby_3mo', openingGreeting: 'Om Swastiastu', openingBody: 'Dengan penuh rasa syukur kami mengundang Bapak/Ibu/Saudara/i pada upacara tiga bulanan putra/putri kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami ucapkan terima kasih.', quote: '', quoteSource: '' },
    { name: 'Ulang Tahun — Ceria', type: 'birthday', openingGreeting: 'Halo!', openingBody: 'Dengan senang hati kami mengundang kamu untuk merayakan ulang tahun bersama kami.', closingGreeting: 'Sampai jumpa', closingBody: 'Kehadiranmu adalah hadiah terbaik!', quote: '', quoteSource: '' },
    { name: 'Pernikahan + Metatah — Klasik', type: 'wedding_metatah', openingGreeting: 'Om Swastiastu', openingBody: 'Kami mengundang Bapak/Ibu/Saudara/i pada upacara pernikahan dan metatah keluarga kami.', closingGreeting: 'Terima kasih', closingBody: 'Atas kehadiran dan doa restunya, kami haturkan terima kasih.', quote: '', quoteSource: '' },
  ])
```

- [ ] **Step 2: Full suite + typecheck**

Run: `npx vitest run` — all pass.
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0.

- [ ] **Step 3: Sanity**

Run:
```bash
ls server/db/migrations/0007_*.sql app/pages/admin/invitation-words.vue server/api/admin/invitation-words/index.get.ts
grep -c "invitationWordId" server/api/admin/invitations/index.post.ts
grep -c "Invitation Word" app/layouts/admin.vue
```
Expected: files exist; create endpoint uses invitationWordId; nav has the item.

- [ ] **Step 4: Commit**

```bash
git add server/db/seed.ts
git commit -m "chore: seed default invitation words (one per type)"
```
(Remind the user: `npm run db:reset` to apply 0007 + seed the words before using the create modal.)

---

## Self-Review (done at write time)

- **Spec §3 (schema):** Task 1. ✅
- **Spec §4 (wordToContent + starterDocument):** Task 2. ✅
- **Spec §5 (CRUD endpoints):** Task 3. ✅
- **Spec §6 (create endpoint required slug+word+unique):** Task 4. ✅
- **Spec §7 (create modal):** Task 5. ✅
- **Spec §8 (admin page + nav):** Task 6. ✅
- **Spec §9 (seed):** Task 7. ✅
- **Spec §10 (testing):** pure word/starter (Task 2); endpoints auth/slug/word via guards + typecheck; UI by typecheck. ✅
- **Spec §12 success criteria:** 1→T3+T6, 2→T4+T5 (filtered word seeds opening/closing/quote), 3→T4 (slug unique 409) + T2 (empty fields fall back), 4→T3 DELETE (no doc change). ✅
- **Placeholder scan:** none.
- **Type consistency:** `InvitationWordContent` fields (openingGreeting…quoteSource) match the table columns + `wordToContent` keys (opening.greeting/body, closing.greeting/body, quote.text/source) match the section schemas; `invitationWordId`/`slug` required in create body (T4) and sent by the modal (T5); word list item `{id,name,type,...}` from GET consumed by both pages. ✅
- **Migration safety:** `db:generate` only (Task 1); user runs `db:reset`/`db:migrate`. ✅
- **Risk flagged:** Task 5 `~~/server/utils/slug` import — verify it resolves (fallback relative path/inline) before commit; UModal v-model:open API per Nuxt UI v4 (same as used in guests.vue Template Pesan modal — already working pattern).
```

# Theme CRUD (custom themes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin create / edit / delete custom themes (full tokens + layout pack) in `/admin/themes`, with curated themes read-only.

**Architecture:** A `builtin` flag on `themes` separates seeded curated themes (read-only) from custom ones. A pure `validateThemeInput` guards POST/PATCH. Thin CRUD endpoints (`themes.post`, `themes/[id].patch`, `themes/[id].delete`) plus a `/admin/themes` page with a `ThemeEditor` modal (full token form + live `ThemePreviewCard`). Custom themes flow into the existing pickers via the unchanged `GET /api/admin/themes`.

**Tech Stack:** Nuxt 4, Vue 3, Drizzle (neon-http) + drizzle-kit, Zod, Nuxt UI v4, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-17-theme-crud-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Migrations:** the agent edits `schema.ts` + runs `npm run db:generate`, but does NOT run `db:migrate`/`db:reset` (the human applies it; dev DB disposable). Tests avoid the DB.

**Note:** untracked `gallery.png` is the user's asset — never stage it.

---

## File Structure

- `server/db/schema.ts` (modify) — `themes.builtin` column (+ `boolean` import).
- `server/db/migrations/000X_*.sql` (generated).
- `server/db/seed.ts`, `server/db/seed-themes.ts` (modify) — seed curated with `builtin: true`.
- `server/theme/validate-theme.ts` (create) — pure `validateThemeInput` + `PACK_KEYS`.
- `server/api/admin/themes.get.ts` (modify) — return `builtin`.
- `server/api/admin/themes.post.ts` (create), `server/api/admin/themes/[id].patch.ts` (create), `server/api/admin/themes/[id].delete.ts` (create).
- `app/components/theme/ThemeEditor.vue` (create) — token form + live preview.
- `app/pages/admin/themes.vue` (create) — list + create/edit/delete.
- `app/layouts/admin.vue` (modify) — nav "Tema".
- Tests: `tests/theme/validate-theme.test.ts` (create), `tests/components/theme-editor.test.ts` (create).

---

### Task 1: `builtin` column + seed + GET

**Files:**
- Modify: `server/db/schema.ts`, `server/db/seed.ts`, `server/db/seed-themes.ts`, `server/api/admin/themes.get.ts`
- Generated: `server/db/migrations/000X_*.sql`

(No unit test — schema/seed/GET verified by typecheck + db:generate + the suite.)

- [ ] **Step 1: Add the column**

In `server/db/schema.ts`, ensure `boolean` is imported from `drizzle-orm/pg-core` (add it to the existing `import { … } from 'drizzle-orm/pg-core'` line if absent). In the `themes` table add after `previewImage`:

```ts
  builtin: boolean('builtin').notNull().default(false),
```

- [ ] **Step 2: Seed curated as built-in**

In `server/db/seed.ts`, change the themes insert mapping to include `builtin: true`:

```ts
    .values(CURATED_THEMES.map((t) => ({ name: t.name, key: t.key ?? 'base', tokens: t.tokens, previewImage: null, builtin: true })))
```

In `server/db/seed-themes.ts`, change the insert to include it:

```ts
    await db.insert(themes).values({ name: t.name, key: t.key ?? 'base', tokens: t.tokens, previewImage: null, builtin: true })
```

- [ ] **Step 3: Return `builtin` from GET**

In `server/api/admin/themes.get.ts`, add `builtin: themes.builtin` to the select:

```ts
  return await db.select({ id: themes.id, name: themes.name, tokens: themes.tokens, previewImage: themes.previewImage, key: themes.key, builtin: themes.builtin }).from(themes)
```

- [ ] **Step 4: Generate the migration**

Run: `npm run db:generate`
Expected: a new `server/db/migrations/000X_*.sql` adding the `builtin` column. Do NOT run `db:migrate`.

- [ ] **Step 5: Typecheck + suite**

Run: `npx nuxt typecheck` → exit 0.
Run: `npx vitest run` → all pass (no behavioural change yet).

- [ ] **Step 6: Commit**

```bash
git add server/db/schema.ts server/db/seed.ts server/db/seed-themes.ts server/api/admin/themes.get.ts server/db/migrations
git commit -m "feat: themes.builtin column + seed curated as built-in"
```

---

### Task 2: `validateThemeInput` + `PACK_KEYS`

**Files:**
- Create: `server/theme/validate-theme.ts`
- Test: `tests/theme/validate-theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/theme/validate-theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateThemeInput, PACK_KEYS } from '../../server/theme/validate-theme'

const goodTokens = {
  color: { primary: '#7a1f2b', secondary: '#9c6b6b', bg: '#fbf6ee', text: '#3a2326', accent: '#c0962f' },
  font: { heading: 'Cinzel', body: 'Lora' },
  radius: { sm: '4px', md: '6px', lg: '8px' },
  ornament: { divider: 'line', motif: 'corners' },
}
const good = { name: 'Tema Saya', key: 'maroon', tokens: goodTokens }

describe('validateThemeInput', () => {
  it('accepts a complete valid theme and normalizes', () => {
    const r = validateThemeInput({ ...good, name: '  Tema Saya  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('Tema Saya')
      expect(r.value.key).toBe('maroon')
      expect(r.value.tokens.color.primary).toBe('#7a1f2b')
    }
  })
  it('rejects empty name', () => {
    expect(validateThemeInput({ ...good, name: '   ' }).ok).toBe(false)
  })
  it('rejects an unknown pack key', () => {
    expect(validateThemeInput({ ...good, key: 'nope' }).ok).toBe(false)
  })
  it('rejects a non-hex colour', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, color: { ...goodTokens.color, primary: 'red' } } }).ok).toBe(false)
  })
  it('rejects a font outside the allow-list', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, font: { heading: 'Comic Sans', body: 'Lora' } } }).ok).toBe(false)
  })
  it('rejects a non-px radius', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, radius: { sm: '4', md: '6px', lg: '8px' } } }).ok).toBe(false)
  })
  it('rejects an out-of-enum divider/motif', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, ornament: { divider: 'zigzag', motif: 'none' } } }).ok).toBe(false)
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, ornament: { divider: 'none', motif: 'stars' } } }).ok).toBe(false)
  })
  it('PACK_KEYS lists the four layouts', () => {
    expect(PACK_KEYS.map((p) => p.value)).toEqual(['base', 'elegant', 'dark_prada', 'maroon'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/theme/validate-theme.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `server/theme/validate-theme.ts`:

```ts
import { HEADING_FONTS, BODY_FONTS } from './fonts'
import type { Tokens } from './tokens'

export const PACK_KEYS = [
  { value: 'base', label: 'Standar' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'dark_prada', label: 'Dark Prada' },
  { value: 'maroon', label: 'Marun Klasik' },
] as const

export interface ThemeInput { name: string; key: string; tokens: any }
export type ThemeValidation =
  | { ok: true; value: { name: string; key: string; tokens: Tokens } }
  | { ok: false; error: string }

const HEX = /^#[0-9a-fA-F]{6}$/
const PX = /^\d+px$/
const KEYS = PACK_KEYS.map((p) => p.value) as readonly string[]
const DIVIDERS = ['none', 'line', 'flourish']
const MOTIFS = ['none', 'corners']

export function validateThemeInput(input: ThemeInput): ThemeValidation {
  const name = (input?.name ?? '').trim()
  if (!name) return { ok: false, error: 'Nama wajib diisi' }
  if (!KEYS.includes(input?.key)) return { ok: false, error: 'Layout tidak valid' }
  const t = input?.tokens
  if (!t || typeof t !== 'object') return { ok: false, error: 'Token tidak valid' }

  for (const k of ['primary', 'secondary', 'bg', 'text', 'accent'] as const) {
    if (!HEX.test(t.color?.[k] ?? '')) return { ok: false, error: `Warna ${k} tidak valid` }
  }
  if (!(HEADING_FONTS as readonly string[]).includes(t.font?.heading)) return { ok: false, error: 'Font heading tidak valid' }
  if (!(BODY_FONTS as readonly string[]).includes(t.font?.body)) return { ok: false, error: 'Font body tidak valid' }
  for (const k of ['sm', 'md', 'lg'] as const) {
    if (!PX.test(t.radius?.[k] ?? '')) return { ok: false, error: `Radius ${k} harus dalam px` }
  }
  if (!DIVIDERS.includes(t.ornament?.divider)) return { ok: false, error: 'Divider tidak valid' }
  if (!MOTIFS.includes(t.ornament?.motif)) return { ok: false, error: 'Motif tidak valid' }

  const tokens: Tokens = {
    color: { primary: t.color.primary, secondary: t.color.secondary, bg: t.color.bg, text: t.color.text, accent: t.color.accent },
    font: { heading: t.font.heading, body: t.font.body },
    radius: { sm: t.radius.sm, md: t.radius.md, lg: t.radius.lg },
    ornament: { divider: t.ornament.divider, motif: t.ornament.motif },
  }
  return { ok: true, value: { name, key: input.key, tokens } }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/theme/validate-theme.test.ts`
Expected: PASS (8).

- [ ] **Step 5: Commit**

```bash
git add server/theme/validate-theme.ts tests/theme/validate-theme.test.ts
git commit -m "feat: validateThemeInput + PACK_KEYS (pure theme validation)"
```

---

### Task 3: CRUD endpoints

**Files:**
- Create: `server/api/admin/themes.post.ts`, `server/api/admin/themes/[id].patch.ts`, `server/api/admin/themes/[id].delete.ts`

(No unit test — thin shells; verified by typecheck + suite.)

- [ ] **Step 1: Create `themes.post.ts`**

```ts
import { useDb } from '../../db'
import { themes } from '../../db/schema'
import { validateThemeInput } from '../../theme/validate-theme'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const v = validateThemeInput(await readBody(event))
  if (!v.ok) throw createError({ statusCode: 400, message: v.error })
  const db = useDb()
  const [row] = await db.insert(themes)
    .values({ name: v.value.name, key: v.value.key, tokens: v.value.tokens, previewImage: null, builtin: false })
    .returning({ id: themes.id, name: themes.name, key: themes.key, tokens: themes.tokens, builtin: themes.builtin })
  return row
})
```

- [ ] **Step 2: Create `themes/[id].patch.ts`**

```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { themes } from '../../../db/schema'
import { validateThemeInput } from '../../../theme/validate-theme'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const [theme] = await db.select({ id: themes.id, builtin: themes.builtin }).from(themes).where(eq(themes.id, id)).limit(1)
  if (!theme) throw createError({ statusCode: 404, message: 'Tema tidak ditemukan' })
  if (theme.builtin) throw createError({ statusCode: 403, message: 'Tema bawaan tidak bisa diubah' })
  const v = validateThemeInput(await readBody(event))
  if (!v.ok) throw createError({ statusCode: 400, message: v.error })
  await db.update(themes).set({ name: v.value.name, key: v.value.key, tokens: v.value.tokens }).where(eq(themes.id, id))
  return { ok: true, id, name: v.value.name, key: v.value.key, tokens: v.value.tokens }
})
```

- [ ] **Step 3: Create `themes/[id].delete.ts`**

```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { themes, invitations } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const [theme] = await db.select({ id: themes.id, builtin: themes.builtin }).from(themes).where(eq(themes.id, id)).limit(1)
  if (!theme) throw createError({ statusCode: 404, message: 'Tema tidak ditemukan' })
  if (theme.builtin) throw createError({ statusCode: 403, message: 'Tema bawaan tidak bisa dihapus' })
  const [used] = await db.select({ id: invitations.id }).from(invitations).where(eq(invitations.themeId, id)).limit(1)
  if (used) throw createError({ statusCode: 409, message: 'Tema sedang dipakai undangan' })
  await db.delete(themes).where(eq(themes.id, id))
  return { ok: true }
})
```

- [ ] **Step 4: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add server/api/admin/themes.post.ts server/api/admin/themes/[id].patch.ts server/api/admin/themes/[id].delete.ts
git commit -m "feat: theme CRUD endpoints (create/edit/delete, builtin + in-use guards)"
```

---

### Task 4: `ThemeEditor` component

**Files:**
- Create: `app/components/theme/ThemeEditor.vue`
- Test: `tests/components/theme-editor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/theme-editor.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeEditor from '../../app/components/theme/ThemeEditor.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const stubs = { ...nuxtUiStubs, ThemePreviewCard: { name: 'ThemePreviewCard', props: ['theme', 'selected'], template: '<div class="tpc">{{ theme.tokens.color.primary }}</div>' } }

describe('ThemeEditor', () => {
  it('renders a live preview seeded from base tokens for a new theme', () => {
    const w = mount(ThemeEditor, { props: { theme: null, onSubmit: vi.fn() }, global: { stubs } })
    expect(w.findComponent({ name: 'ThemePreviewCard' }).exists()).toBe(true)
  })
  it('submits the assembled name/key/tokens', async () => {
    const onSubmit = vi.fn()
    const theme = { id: 't', name: 'Tema X', key: 'maroon', tokens: {
      color: { primary: '#7a1f2b', secondary: '#9c6b6b', bg: '#fbf6ee', text: '#3a2326', accent: '#c0962f' },
      font: { heading: 'Cinzel', body: 'Lora' }, radius: { sm: '4px', md: '6px', lg: '8px' }, ornament: { divider: 'line', motif: 'none' },
    } }
    const w = mount(ThemeEditor, { props: { theme, onSubmit }, global: { stubs } })
    await w.find('[data-save]').trigger('click')
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tema X', key: 'maroon', tokens: expect.objectContaining({ color: expect.any(Object) }) }))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/theme-editor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/components/theme/ThemeEditor.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { baseTokens } from '~~/server/theme/tokens'
import { HEADING_FONTS, BODY_FONTS } from '~~/server/theme/fonts'
import { PACK_KEYS } from '~~/server/theme/validate-theme'
import ThemePreviewCard from './ThemePreviewCard.vue'

interface Theme { id?: string; name: string; key: string; tokens: any }
const props = defineProps<{ theme: Theme | null; onSubmit: (t: { name: string; key: string; tokens: any }) => void | Promise<void> }>()

const seed = props.theme ?? { name: '', key: 'base', tokens: baseTokens }
const name = ref(seed.name)
const key = ref(seed.key)
const tokens = ref(JSON.parse(JSON.stringify(seed.tokens)))

const colorKeys = ['primary', 'secondary', 'bg', 'text', 'accent'] as const
const dividerItems = ['none', 'line', 'flourish'].map((v) => ({ label: v, value: v }))
const motifItems = ['none', 'corners'].map((v) => ({ label: v, value: v }))
const headingItems = HEADING_FONTS.map((f) => ({ label: f, value: f }))
const bodyItems = BODY_FONTS.map((f) => ({ label: f, value: f }))
const keyItems = PACK_KEYS.map((p) => ({ label: p.label, value: p.value }))

const preview = computed(() => ({ id: 'preview', name: name.value || 'Pratinjau', tokens: tokens.value }))

function submit() {
  props.onSubmit({ name: name.value, key: key.value, tokens: tokens.value })
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-3 text-sm">
      <UFormField label="Nama"><UInput v-model="name" class="w-full" /></UFormField>
      <UFormField label="Layout"><USelect v-model="key" :items="keyItems" class="w-full" /></UFormField>
      <div v-for="k in colorKeys" :key="k" class="flex items-center gap-2">
        <span class="w-20 capitalize">{{ k }}</span>
        <input type="color" v-model="tokens.color[k]" :data-color="k" class="h-8 w-10" />
        <UInput v-model="tokens.color[k]" class="flex-1" />
      </div>
      <UFormField label="Font Heading"><USelect v-model="tokens.font.heading" :items="headingItems" class="w-full" /></UFormField>
      <UFormField label="Font Body"><USelect v-model="tokens.font.body" :items="bodyItems" class="w-full" /></UFormField>
      <div class="flex gap-2">
        <UFormField label="Radius sm"><UInput v-model="tokens.radius.sm" /></UFormField>
        <UFormField label="md"><UInput v-model="tokens.radius.md" /></UFormField>
        <UFormField label="lg"><UInput v-model="tokens.radius.lg" /></UFormField>
      </div>
      <UFormField label="Divider"><USelect v-model="tokens.ornament.divider" :items="dividerItems" class="w-full" /></UFormField>
      <UFormField label="Motif"><USelect v-model="tokens.ornament.motif" :items="motifItems" class="w-full" /></UFormField>
      <UButton data-save label="Simpan" @click="submit" />
    </div>
    <div>
      <p class="mb-2 text-xs text-muted">Pratinjau</p>
      <ThemePreviewCard :theme="preview" :selected="false" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/theme-editor.test.ts`
Expected: PASS (2). (The `data-save` button triggers `submit`; the `ThemePreviewCard` stub renders.)

- [ ] **Step 5: Commit**

```bash
git add app/components/theme/ThemeEditor.vue tests/components/theme-editor.test.ts
git commit -m "feat: ThemeEditor (full token form + live preview)"
```

---

### Task 5: `/admin/themes` page + nav

**Files:**
- Create: `app/pages/admin/themes.vue`
- Modify: `app/layouts/admin.vue`

(No unit test — the page is a thin shell over `useFetch`/`$fetch`; verified by typecheck + suite. `ThemeEditor` + endpoints are tested.)

- [ ] **Step 1: Add the nav item**

In `app/layouts/admin.vue`, add to the nav array (after the Invitation Word entry):

```ts
    { label: 'Tema', icon: 'i-lucide-palette', to: '/admin/themes' },
```

- [ ] **Step 2: Create the page**

Create `app/pages/admin/themes.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ThemeEditor from '~/components/theme/ThemeEditor.vue'
import ThemePreviewCard from '~/components/theme/ThemePreviewCard.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch<any[]>('/api/admin/themes')
const open = ref(false)
const editing = ref<any | null>(null)
const error = ref('')

function add() { editing.value = null; error.value = ''; open.value = true }
function edit(t: any) { editing.value = t; error.value = ''; open.value = true }

async function onSubmit(payload: { name: string; key: string; tokens: any }) {
  error.value = ''
  try {
    if (editing.value?.id) await $fetch(`/api/admin/themes/${editing.value.id}`, { method: 'PATCH', body: payload })
    else await $fetch('/api/admin/themes', { method: 'POST', body: payload })
    open.value = false
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal menyimpan'
  }
}

async function remove(t: any) {
  if (!confirm(`Hapus tema "${t.name}"?`)) return
  try { await $fetch(`/api/admin/themes/${t.id}`, { method: 'DELETE' }); await refresh() }
  catch (e: any) { alert(e?.data?.message ?? 'Gagal menghapus') }
}
</script>

<template>
  <UDashboardPanel id="themes">
    <template #header>
      <UDashboardNavbar title="Tema">
        <template #right><UButton icon="i-lucide-plus" label="Tema Baru" @click="add" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="t in (data ?? [])" :key="t.id" class="space-y-2">
          <ThemePreviewCard :theme="t" :selected="false" />
          <div class="flex items-center justify-between px-1">
            <span v-if="t.builtin" class="rounded bg-elevated px-2 py-0.5 text-xs text-muted">Bawaan</span>
            <span v-else class="flex gap-2">
              <UButton size="xs" variant="ghost" icon="i-lucide-pencil" @click="edit(t)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash" @click="remove(t)" />
            </span>
          </div>
        </div>
      </div>
      <UModal v-model:open="open" :title="editing ? 'Edit Tema' : 'Tema Baru'">
        <template #body>
          <p v-if="error" class="mb-2 text-sm text-error">{{ error }}</p>
          <ThemeEditor :theme="editing" :on-submit="onSubmit" />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 3: Typecheck + suite**

Run: `npx nuxt typecheck` → exit 0.
Run: `npx vitest run` → all pass.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/themes.vue app/layouts/admin.vue
git commit -m "feat: /admin/themes page (list + create/edit/delete) + nav"
```

---

### Task 6: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + validate-theme 8 + theme-editor 2).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: `/admin/themes` lists themes (curated read-only "Bawaan"; custom editable/deletable), the `ThemeEditor` builds a custom theme (full tokens + layout pack) with live preview, endpoints validate + guard (builtin 403, in-use 409). Flag the human prerequisite: run `npm run db:reset` (adds the `builtin` column + re-seeds curated as built-in), then verify creating a custom theme appears in the create-invitation + editor pickers. Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 schema → Task 1; §4 seed → Task 1; §5 validator/PACK_KEYS → Task 2; §6 endpoints → Task 3 (+ GET in Task 1); §7 page/editor/nav → Tasks 4–5; §8 testing → Tasks 2/4 + Task 6 gate. All covered.
- **Type consistency:** `validateThemeInput` returns `{ ok, value: { name, key, tokens } }` consumed by POST + PATCH (Task 3); `ThemeEditor` emits `{ name, key, tokens }` via `onSubmit`, consumed by the page's `onSubmit` → POST/PATCH (Task 5); `PACK_KEYS` shared (Task 2) by validator + editor.
- **Built-in protection:** seeded curated → `builtin: true` (Task 1); PATCH/DELETE 403 on builtin, DELETE 409 when in use (Task 3); UI hides edit/delete for `builtin` (Task 5).
- **Pickers unchanged:** custom themes flow through the existing `GET /api/admin/themes` (now also returns `builtin`); `ThemePreviewCard` already renders any theme's tokens.
- **Migration discipline:** agent runs `db:generate` only (Task 1); human runs `db:reset` (flagged in Task 6). Tests avoid the DB.
- **Client imports of server pure modules:** `ThemeEditor` imports `baseTokens`/`HEADING_FONTS`/`BODY_FONTS`/`PACK_KEYS` from `~~/server/...` (pure TS, the established app→server pattern).

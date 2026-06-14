# Phase 4 — Additional Themes + Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a curated set of themes (distinct palette + font pairing each), seeded idempotently, with a theme picker on invitation create and a live theme switcher in the editor.

**Architecture:** Themes are seeded data (no CRUD). A `CURATED_THEMES` constant feeds both the full seed and an idempotent theme-seed script. A read endpoint lists themes for the pickers; an owner-guarded PATCH switches an invitation's theme. The editor makes `themeTokens` reactive so switching re-resolves `cssVars` instantly; customer overrides keep layering on top.

**Tech Stack:** Nuxt 4 (Nitro), Drizzle ORM + Neon Postgres, Zod, Vitest, Nuxt UI v4.

**Branch:** `feat/phase-2b-media` (continuation). No migration (themes table exists). Dev DB disposable.

**Grounding facts:**
- `themes` table: `{ id, name, tokens (jsonb), previewImage }`. Currently one row seeded inline in `server/db/seed.ts`.
- `server/theme/fonts.ts`: `HEADING_FONTS = ['Cormorant Garamond','Playfair Display','Marcellus','Great Vibes','Cinzel']`, `BODY_FONTS = ['Poppins','Lora','Nunito Sans','EB Garamond']`. Theme fonts must come from these (loaded globally).
- `server/theme/tokens.ts`: `Tokens` shape `{ color:{primary,secondary,bg,text,accent}, font:{heading,body}, radius, ornament }`; `resolveTokens(theme, overrides)` deep-merges `baseTokens → theme → whitelisted overrides`, so themes can store partial `{ color, font }`.
- `POST /api/admin/invitations` already accepts an optional `themeId`; the create form (`app/pages/admin/invitations/index.vue`) currently sends only `{ title, type }`.
- Editor (`app/pages/admin/invitations/[id]/edit.vue`): `themeTokens` is a `const` (line 27) used by `cssVars = computed(...)` (line 29); the editor GET response has `themeId` + `themeTokens`. `<DesignControls :theme-tokens="themeTokens" />` is in the template.
- `assertOwnerOr404` (server/utils/ownership.ts) → 404. `package.json` scripts include `"db:seed": "tsx server/db/seed.ts"`.

---

## File Structure

- Create `server/theme/curated-themes.ts` — `CuratedTheme` type + `CURATED_THEMES`.
- Modify `server/db/seed.ts` — seed all curated themes; demo uses the first.
- Create `server/db/seed-themes.ts` — idempotent theme upsert; + `db:seed:themes` script in `package.json`.
- Create `server/api/admin/themes.get.ts` — list themes.
- Create `server/api/admin/invitations/[id]/theme.patch.ts` — switch theme.
- Modify `app/pages/admin/invitations/index.vue` — theme picker on create.
- Modify `app/pages/admin/invitations/[id]/edit.vue` — reactive themeTokens + theme switcher.
- Test: `tests/theme/curated-themes.test.ts`.

---

## Task 1: Curated themes constant

**Files:**
- Create: `server/theme/curated-themes.ts`
- Test: `tests/theme/curated-themes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/theme/curated-themes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CURATED_THEMES } from '../../server/theme/curated-themes'
import { HEADING_FONTS, BODY_FONTS } from '../../server/theme/fonts'

const HEX = /^#[0-9a-f]{6}$/i

describe('CURATED_THEMES', () => {
  it('has at least 5 themes with unique names', () => {
    expect(CURATED_THEMES.length).toBeGreaterThanOrEqual(5)
    const names = CURATED_THEMES.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('every theme has 5 valid hex colours and allow-listed fonts', () => {
    for (const t of CURATED_THEMES) {
      for (const k of ['primary', 'secondary', 'bg', 'text', 'accent'] as const) {
        expect(HEX.test(t.tokens.color[k]), `${t.name}.${k}=${t.tokens.color[k]}`).toBe(true)
      }
      expect(HEADING_FONTS as readonly string[]).toContain(t.tokens.font.heading)
      expect(BODY_FONTS as readonly string[]).toContain(t.tokens.font.body)
    }
  })
  it('the first theme is Radiant Love (the default/demo theme)', () => {
    expect(CURATED_THEMES[0].name).toBe('Radiant Love')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme/curated-themes.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/theme/curated-themes.ts`**

```ts
import type { Tokens } from './tokens'

export interface CuratedTheme { name: string; tokens: Pick<Tokens, 'color' | 'font'> }

// Palette (5 colours) + font pairing per theme. Fonts are from the curated
// allow-list (server/theme/fonts.ts) so they load globally. radius/ornament fall
// back to baseTokens via resolveTokens. The first entry is the default/demo theme.
export const CURATED_THEMES: CuratedTheme[] = [
  {
    name: 'Radiant Love',
    tokens: { color: { primary: '#8b5e3c', secondary: '#c8a97e', bg: '#faf6f0', text: '#2e2a26', accent: '#a47148' }, font: { heading: 'Cormorant Garamond', body: 'Poppins' } },
  },
  {
    name: 'Rose Blush',
    tokens: { color: { primary: '#b76e79', secondary: '#e8b4bc', bg: '#fdf6f7', text: '#3a2c2e', accent: '#d98b96' }, font: { heading: 'Playfair Display', body: 'Lora' } },
  },
  {
    name: 'Emerald Garden',
    tokens: { color: { primary: '#2f6b4f', secondary: '#8cb79b', bg: '#f4f8f4', text: '#20302a', accent: '#58927a' }, font: { heading: 'Marcellus', body: 'Nunito Sans' } },
  },
  {
    name: 'Midnight Gold',
    tokens: { color: { primary: '#c9a14a', secondary: '#b8923c', bg: '#1c2230', text: '#eae3d2', accent: '#d9b863' }, font: { heading: 'Cinzel', body: 'EB Garamond' } },
  },
  {
    name: 'Dusty Blue',
    tokens: { color: { primary: '#5a7a99', secondary: '#a9c0d4', bg: '#f5f8fb', text: '#28323d', accent: '#7a99b5' }, font: { heading: 'Cormorant Garamond', body: 'Nunito Sans' } },
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme/curated-themes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/theme/curated-themes.ts tests/theme/curated-themes.test.ts
git commit -m "feat: curated themes (palette + font pairing) constant"
```

---

## Task 2: Seed all themes + idempotent theme-seed script

**Files:**
- Modify: `server/db/seed.ts`
- Create: `server/db/seed-themes.ts`
- Modify: `package.json` (add `db:seed:themes`)

- [ ] **Step 1: Seed all curated themes in `seed.ts`**

In `server/db/seed.ts`, add the import and replace the single inline theme insert.

Add near the other imports:
```ts
import { CURATED_THEMES } from '../theme/curated-themes'
```

Replace the block:
```ts
  const [theme] = await db.insert(themes).values({
    name: 'Radiant Love',
    tokens: { color: { primary: '#8b5e3c', secondary: '#c8a97e' }, font: { heading: 'Cormorant Garamond', body: 'Poppins' } },
    previewImage: null,
  }).returning()
```
with:
```ts
  const insertedThemes = await db.insert(themes)
    .values(CURATED_THEMES.map((t) => ({ name: t.name, tokens: t.tokens, previewImage: null })))
    .returning()
  const theme = insertedThemes[0] // Radiant Love (default/demo)
```
(The rest of `seed.ts` uses `theme!.id` for the demo invitation — unchanged.)

- [ ] **Step 2: Create the idempotent theme seed `server/db/seed-themes.ts`**

```ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { useDb } from './index'
import { themes } from './schema'
import { CURATED_THEMES } from '../theme/curated-themes'

// Idempotent: inserts each curated theme only if a theme with that name is absent.
// Safe to run against an existing DB without wiping data.
async function main() {
  const db = useDb()
  for (const t of CURATED_THEMES) {
    const [existing] = await db.select({ id: themes.id }).from(themes).where(eq(themes.name, t.name)).limit(1)
    if (existing) { console.log(`skip (exists): ${t.name}`); continue }
    await db.insert(themes).values({ name: t.name, tokens: t.tokens, previewImage: null })
    console.log(`added: ${t.name}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Add the script to `package.json`**

In the `"scripts"` object, after `"db:seed"`, add:
```json
    "db:seed:themes": "tsx server/db/seed-themes.ts",
```

- [ ] **Step 4: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)
(Do NOT run `db:seed`/`db:seed:themes` — those hit the DB; the user runs them.)

- [ ] **Step 5: Commit**

```bash
git add server/db/seed.ts server/db/seed-themes.ts package.json
git commit -m "feat: seed all curated themes + idempotent db:seed:themes script"
```

---

## Task 3: `GET /api/admin/themes`

**Files:**
- Create: `server/api/admin/themes.get.ts`

- [ ] **Step 1: Implement the endpoint**

Create `server/api/admin/themes.get.ts`:

```ts
import { useDb } from '../../db'
import { themes } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  return await db.select({ id: themes.id, name: themes.name, tokens: themes.tokens, previewImage: themes.previewImage }).from(themes)
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/themes.get.ts
git commit -m "feat: GET /api/admin/themes lists available themes"
```

---

## Task 4: `PATCH /api/admin/invitations/:id/theme`

**Files:**
- Create: `server/api/admin/invitations/[id]/theme.patch.ts`

- [ ] **Step 1: Implement the endpoint**

Create `server/api/admin/invitations/[id]/theme.patch.ts`:

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, themes } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'

const body = z.object({ themeId: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })

  const [theme] = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, parsed.data.themeId)).limit(1)
  if (!theme) throw createError({ statusCode: 400, message: 'Invalid theme' })

  await db.update(invitations).set({ themeId: parsed.data.themeId, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, themeId: parsed.data.themeId }
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "server/api/admin/invitations/[id]/theme.patch.ts"
git commit -m "feat: PATCH /theme switches an invitation's theme (owner-guarded, validates theme)"
```

---

## Task 5: Theme picker on the create form

**Files:**
- Modify: `app/pages/admin/invitations/index.vue`

- [ ] **Step 1: Add the themes fetch + select + include themeId in the create body**

In `app/pages/admin/invitations/index.vue`:

Change the imports line:
```ts
import { ref, computed, watchEffect } from 'vue'
```

After `const { data: list } = await useFetch('/api/admin/invitations')`, add:
```ts
const { data: themes } = await useFetch<any>('/api/admin/themes')
const themeId = ref<string>('')
const themeItems = computed(() => ((themes.value as any[]) ?? []).map((t) => ({ label: t.name, value: t.id })))
watchEffect(() => { if (!themeId.value && (themes.value as any[])?.length) themeId.value = (themes.value as any[])[0].id })
```

Change the create body to include themeId:
```ts
    const inv = await $fetch<{ id: string }>('/api/admin/invitations', { method: 'POST', body: { title: title.value, type: type.value, themeId: themeId.value || undefined } })
```

In the form template, add a theme field after the Tipe field (before the Buat button):
```vue
          <UFormField label="Tema">
            <USelect v-model="themeId" :items="themeItems" />
          </UFormField>
```

- [ ] **Step 2: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/invitations/index.vue
git commit -m "feat: pick a theme when creating an invitation"
```

---

## Task 6: Editor theme switcher (live)

**Files:**
- Modify: `app/pages/admin/invitations/[id]/edit.vue`

- [ ] **Step 1: Make themeTokens reactive + load themes + add switch logic**

In `app/pages/admin/invitations/[id]/edit.vue`:

Replace line 27:
```ts
const themeTokens = ((data.value as any).themeTokens ?? {}) as Record<string, any>
```
with:
```ts
const themeTokens = ref<Record<string, any>>(((data.value as any).themeTokens ?? {}) as Record<string, any>)
const themeId = ref<string>((data.value as any).themeId ?? '')
const { data: themesList } = await useFetch<any>('/api/admin/themes')
const themeItems = computed(() => ((themesList.value as any[]) ?? []).map((t) => ({ label: t.name, value: t.id })))
```

Update the `cssVars` computed (line 29) to read `themeTokens.value`:
```ts
const cssVars = computed(() => tokensToCssVars(resolveTokens(themeTokens.value as any, overrides.value as any)))
```

Add the switch handler + watcher near the other `watch`/functions (e.g. after the `watch(overrides, …)` line):
```ts
async function switchTheme(newId: string) {
  const t = ((themesList.value as any[]) ?? []).find((x) => x.id === newId)
  if (t) themeTokens.value = t.tokens
  try { await $fetch(`/api/admin/invitations/${id}/theme`, { method: 'PATCH', body: { themeId: newId } }) } catch { /* non-fatal; preview already updated */ }
}
watch(themeId, (v) => { if (v) switchTheme(v) })
```
(`watch` is already imported in this file; the watcher is change-only, so it does not fire on the initial value — no spurious PATCH on load.)

- [ ] **Step 2: Add the theme select in the template**

Find `<DesignControls v-model="overrides" :theme-tokens="themeTokens" />` and add a theme select immediately before it:
```vue
          <UFormField label="Tema" class="mb-3">
            <USelect v-model="themeId" :items="themeItems" class="w-full" />
          </UFormField>
          <DesignControls v-model="overrides" :theme-tokens="themeTokens" />
```
(`:theme-tokens="themeTokens"` now passes the unwrapped ref value in the template binding — `DesignControls` still receives the tokens object.)

- [ ] **Step 3: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

- [ ] **Step 4: Commit**

```bash
git add "app/pages/admin/invitations/[id]/edit.vue"
git commit -m "feat: editor theme switcher with live preview"
```

---

## Task 7: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 159 + the curated-themes cases). Zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Sanity**

Run:
```bash
ls server/api/admin/themes.get.ts server/api/admin/invitations/[id]/theme.patch.ts server/db/seed-themes.ts
grep -c "db:seed:themes" package.json
grep -c "CURATED_THEMES" server/db/seed.ts
```
Expected: files exist; script present; seed.ts uses CURATED_THEMES.

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize phase 4 themes"
```

(Skip if the tree is already clean. Remind the user to run `npm run db:seed:themes` — or reset + `npm run db:seed` — to load the new themes.)

---

## Self-Review (done at write time)

- **Spec §3 (curated themes):** Task 1. ✅
- **Spec §4 (seeding: full + idempotent):** Task 2. ✅
- **Spec §5 (endpoints):** Task 3 (GET themes) + Task 4 (PATCH theme). ✅
- **Spec §6 (create picker):** Task 5. ✅
- **Spec §7 (editor switcher):** Task 6 (reactive themeTokens, switch + PATCH, layered overrides preserved — `cssVars` still applies `overrides` over the new theme). ✅
- **Spec §8 (testing):** pure `CURATED_THEMES` validity (Task 1); endpoints via owner-guard/auth/theme-exists guards per the thin-shell convention; create/editor verified by typecheck + suite. ✅
- **Spec §10 success criteria:** 1→T2+T5, 2→T4+T6, 3→T6 (`cssVars` layers overrides over themeTokens), 4→T4. ✅
- **Placeholder scan:** none.
- **Type consistency:** `CuratedTheme { name, tokens: Pick<Tokens,'color'|'font'> }` used in Task 1/2; theme list item `{ id, name, tokens, previewImage }` from Task 3 consumed by Tasks 5/6 (`themeItems` maps name→label, id→value; `switchTheme` reads `.tokens`). `themeId`/`themeTokens` consistent in Task 6. ✅
- **No migration.** Dev DB disposable; user runs the seed. ✅
- **Risk flagged:** Task 6 changes `themeTokens` from a `const` to a `ref` — every reader must use `.value` in script (`cssVars`) while the template binding auto-unwraps; the plan updates the one script reader (line 29). Verify no other script reference to `themeTokens` exists before committing.
```

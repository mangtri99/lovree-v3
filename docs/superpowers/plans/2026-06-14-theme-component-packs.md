# Theme Component Packs (iteration 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a theme select a per-section layout (component pack) with a `base` fallback, threaded through render; ship one proof theme (`elegant`) overriding Hero + Couple.

**Architecture:** A theme carries a `key`. `resolveSectionComponent(themeKey, type)` returns the theme's component for that section, falling back to the shared `base` pack (current components). `themeKey` is threaded from the theme row → assembled/public + editor responses → `SectionRenderer`. Layout (pack, keyed) and palette (tokens/CSS vars) are separate axes; pack components read CSS vars so a layout works with any palette.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Drizzle, Zod, Vitest + @vue/test-utils.

**Branch:** `feat/phase-2b-media`. Migration `0006`. Dev DB disposable (reseed after).

**Grounding facts:**
- `themes` table: `{ id, name, tokens, previewImage }` (no key yet). `CURATED_THEMES` (server/theme/curated-themes.ts): `CuratedTheme = { name; tokens: Pick<Tokens,'color'|'font'> }`; seeded by `seed.ts` (inserts all) + `seed-themes.ts` (idempotent).
- `assembleInvitation(inv, theme, sections)` → `{ id, slug, type, status, ownerId, cssVars, sections }` (type `AssembledInvitation`). `loadInvitationBySlug` returns `{ ...assembled, ownerId, musicUrl, publishedAt }`; the public route returns `{ ...publicData, sections, guestName, guestbook }`.
- Editor GET (`…/[id]/index.get.ts`) loads `theme` and returns `themeId`, `themeTokens`, etc. `GET /api/admin/themes` selects `{ id, name, tokens, previewImage }`.
- `SectionRenderer.vue` imports `sectionComponents` and resolves `sectionComponents[section.type]`. Used by `InvitationRoot.vue` (`<SectionRenderer v-for sections>`) and `EditorPreview.vue` (`<SectionRenderer v-for visible>`).
- `edit.vue`: `themeId` ref, `themesList` (from GET themes), `switchTheme(newId)` sets `themeTokens.value` + PATCHes; `<EditorPreview :css-vars :device :show-cover :music-url>`.
- Current `HeroSection` props `{ title, coupleName, date }`; `CoupleSection` props `{ people: Person[] }` (Person = name, parents, childOrder, address, instagram, photo:{mediaId,url}). Both read `--color-*`/`--font-*` CSS vars.

---

## File Structure

- Modify `server/db/schema.ts` — `themes.key`; migration 0006.
- Create `app/components/invitation/themes/elegant/HeroSection.vue`, `CoupleSection.vue`.
- Create `app/components/invitation/themePacks.ts` — `resolveSectionComponent`.
- Modify `server/utils/invitation.ts` — `themeKey` in assemble/load.
- Modify `server/api/admin/invitations/[id]/index.get.ts` — return `themeKey`.
- Modify `server/api/admin/themes.get.ts` — select `key`.
- Modify `app/components/invitation/SectionRenderer.vue` — `themeKey` prop + resolver.
- Modify `app/components/invitation/InvitationRoot.vue` + `app/components/editor/EditorPreview.vue` + `app/pages/admin/invitations/[id]/edit.vue` — thread `themeKey`.
- Modify `server/theme/curated-themes.ts` + `server/db/seed.ts` + `server/db/seed-themes.ts` — `key` + elegant theme.
- Tests: `tests/components/theme-packs.test.ts`, `tests/components/elegant-sections.test.ts`, `tests/registry`/`tests/...` for assemble.

---

## Task 1: Schema — `themes.key` (migration 0006)

**Files:** Modify `server/db/schema.ts`; generated `server/db/migrations/0006_*.sql`.

- [ ] **Step 1: Add the column**

In `server/db/schema.ts`, `themes` table, add after `name`:
```ts
  key: text('key').notNull().default('base'),
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate` → expect `server/db/migrations/0006_*.sql` (`ALTER TABLE themes ADD COLUMN key text DEFAULT 'base' NOT NULL`). Confirm: `ls server/db/migrations/0006_*.sql`.
If `db:generate` prompts interactively (non-TTY), hand-write `server/db/migrations/0006_theme_key.sql` with exactly:
```sql
ALTER TABLE "themes" ADD COLUMN "key" text DEFAULT 'base' NOT NULL;
```
and update the drizzle journal/snapshot the same way the existing `0005` was handled (mirror its meta entry). Do NOT run `db:migrate`.

- [ ] **Step 3: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add server/db/schema.ts server/db/migrations/
git commit -m "feat: themes.key column for theme component packs (migration 0006)"
```

---

## Task 2: Pack resolver + elegant components

**Files:**
- Create: `app/components/invitation/themes/elegant/HeroSection.vue`, `app/components/invitation/themes/elegant/CoupleSection.vue`, `app/components/invitation/themePacks.ts`
- Test: `tests/components/theme-packs.test.ts`, `tests/components/elegant-sections.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/theme-packs.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveSectionComponent } from '../../app/components/invitation/themePacks'
import HeroSection from '../../app/components/invitation/sections/HeroSection.vue'
import FooterSection from '../../app/components/invitation/sections/FooterSection.vue'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'

describe('resolveSectionComponent', () => {
  it('returns the theme pack component when the theme overrides the section', () => {
    expect(resolveSectionComponent('elegant', 'hero')).toBe(ElegantHero)
  })
  it('falls back to the base component for a section the theme does not override', () => {
    expect(resolveSectionComponent('elegant', 'footer')).toBe(FooterSection)
  })
  it('uses base for the base theme', () => {
    expect(resolveSectionComponent('base', 'hero')).toBe(HeroSection)
  })
  it('returns null for an unknown section type', () => {
    expect(resolveSectionComponent('elegant', 'nope')).toBe(null)
  })
})
```

Create `tests/components/elegant-sections.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'
import ElegantCouple from '../../app/components/invitation/themes/elegant/CoupleSection.vue'

describe('elegant theme sections', () => {
  it('Hero renders title, couple name, date', () => {
    const w = mount(ElegantHero, { props: { content: { title: 'The Wedding Of', coupleName: 'W & D', date: '1 Sep 2026' } } })
    expect(w.text()).toContain('W & D')
    expect(w.text()).toContain('The Wedding Of')
    expect(w.text()).toContain('1 Sep 2026')
  })
  it('Couple renders each person name', () => {
    const person = (n: string) => ({ name: n, parents: '', childOrder: '', address: '', instagram: '', photo: { mediaId: '', url: '' } })
    const w = mount(ElegantCouple, { props: { content: { people: [person('Willy'), person('Debby')] } } })
    expect(w.text()).toContain('Willy')
    expect(w.text()).toContain('Debby')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/theme-packs.test.ts tests/components/elegant-sections.test.ts`
Expected: FAIL — files do not exist.

- [ ] **Step 3: Create the elegant components**

`app/components/invitation/themes/elegant/HeroSection.vue` (distinct layout — date eyebrow on top, ornamental divider, large italic name, title below):
```vue
<script setup lang="ts">
defineProps<{ content: { title: string; coupleName: string; date: string } }>()
</script>
<template>
  <section class="py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ content.date }}</p>
    <div class="mx-auto my-6 h-px w-16" style="background: var(--color-secondary)" />
    <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p class="mt-4 uppercase tracking-[0.25em]" style="color: var(--color-secondary)">{{ content.title }}</p>
  </section>
</template>
```

`app/components/invitation/themes/elegant/CoupleSection.vue` (distinct layout — side-by-side framed cards):
```vue
<script setup lang="ts">
type Person = { name: string; parents: string; childOrder: string; address: string; instagram: string; photo: { mediaId: string; url: string } }
defineProps<{ content: { people: Person[] } }>()
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div class="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
      <div v-for="(p, i) in content.people" :key="i" class="rounded-lg border p-6 text-center" style="border-color: var(--color-secondary)">
        <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-4 h-28 w-28 rounded-full object-cover" loading="lazy" />
        <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
        <p v-if="p.childOrder" class="mt-1 text-sm">{{ p.childOrder }}</p>
        <p v-if="p.parents" class="mt-2 whitespace-pre-line text-sm">{{ p.parents }}</p>
        <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-2 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Create the resolver**

`app/components/invitation/themePacks.ts`:
```ts
import { sectionComponents as base } from './sectionComponents'
import ElegantHero from './themes/elegant/HeroSection.vue'
import ElegantCouple from './themes/elegant/CoupleSection.vue'

// themeKey -> (sectionType -> component). A theme overrides only the sections that
// differ; everything else falls back to the shared `base` pack.
const packs: Record<string, Record<string, any>> = {
  elegant: { hero: ElegantHero, couple: ElegantCouple },
}

export function resolveSectionComponent(themeKey: string, type: string): any | null {
  return packs[themeKey]?.[type] ?? base[type] ?? null
}
```

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/theme-packs.test.ts tests/components/elegant-sections.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/themePacks.ts app/components/invitation/themes/ tests/components/theme-packs.test.ts tests/components/elegant-sections.test.ts
git commit -m "feat: theme pack resolver + elegant Hero/Couple components"
```

---

## Task 3: Thread `themeKey` server-side

**Files:**
- Modify: `server/utils/invitation.ts`
- Modify: `server/api/admin/invitations/[id]/index.get.ts`
- Modify: `server/api/admin/themes.get.ts`
- Test: `tests/...` for assemble (see Step 1)

- [ ] **Step 1: Write the failing test**

Find the existing test for `assembleInvitation` (search `tests/` for `assembleInvitation`); if one exists, add cases there, else create `tests/server/assemble-theme-key.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

const inv = { id: 'i1', slug: 's', type: 'wedding', status: 'published', ownerId: 'o', tokenOverrides: {} }

describe('assembleInvitation themeKey', () => {
  it('uses the theme key', () => {
    expect(assembleInvitation(inv, { tokens: {}, key: 'elegant' }, []).themeKey).toBe('elegant')
  })
  it('defaults to base when theme/key absent', () => {
    expect(assembleInvitation(inv, undefined, []).themeKey).toBe('base')
    expect(assembleInvitation(inv, { tokens: {} }, []).themeKey).toBe('base')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run -t "assembleInvitation themeKey"`
Expected: FAIL — `themeKey` undefined.

- [ ] **Step 3: Implement**

`server/utils/invitation.ts`:
- Extend `AssembledInvitation` with `themeKey: string`.
- In `assembleInvitation`, add to the returned object: `themeKey: theme?.key ?? 'base'`.
(`loadInvitationBySlug` already spreads `...assembled`, so `themeKey` flows to the public response automatically.)

`server/api/admin/invitations/[id]/index.get.ts`: add to the returned object:
```ts
    themeKey: (theme as any)?.key ?? 'base',
```

`server/api/admin/themes.get.ts`: add `key: themes.key` to the `.select({...})`.

- [ ] **Step 4: Run, confirm PASS + suite**

Run: `npx vitest run -t "assembleInvitation themeKey"` (PASS)
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0)
Run: `npx vitest run` (all pass)

- [ ] **Step 5: Commit**

```bash
git add server/utils/invitation.ts "server/api/admin/invitations/[id]/index.get.ts" server/api/admin/themes.get.ts tests/
git commit -m "feat: expose themeKey from assemble + editor GET + themes list"
```

---

## Task 4: Thread `themeKey` client-side (SectionRenderer + Root + Preview + editor)

**Files:**
- Modify: `app/components/invitation/SectionRenderer.vue`
- Modify: `app/components/invitation/InvitationRoot.vue`
- Modify: `app/components/editor/EditorPreview.vue`
- Modify: `app/pages/admin/invitations/[id]/edit.vue`

- [ ] **Step 1: SectionRenderer uses the resolver**

Replace `app/components/invitation/SectionRenderer.vue`:
```vue
<script setup lang="ts">
defineOptions({ name: 'SectionRenderer' })
import { computed } from 'vue'
import { resolveSectionComponent } from './themePacks'

const props = defineProps<{ section: { type: string; content: any }; themeKey?: string }>()
const resolved = computed(() => resolveSectionComponent(props.themeKey ?? 'base', props.section.type))
</script>

<template>
  <component :is="resolved" v-if="resolved" :content="section.content" />
</template>
```

- [ ] **Step 2: InvitationRoot passes themeKey**

In `app/components/invitation/InvitationRoot.vue`:
- Extend the `data` prop type with `themeKey?: string`.
- Pass it to the renderer: `<SectionRenderer v-for="(s, i) in data.sections" :key="i" :section="s" :theme-key="data.themeKey ?? 'base'" />`.

- [ ] **Step 3: EditorPreview accepts + passes themeKey**

In `app/components/editor/EditorPreview.vue`:
- Add `themeKey?: string` to the `defineProps` object.
- Pass to the renderer: `<SectionRenderer v-for="s in visible" :key="s.id" :section="s" :theme-key="themeKey ?? 'base'" />`.

- [ ] **Step 4: Editor tracks themeKey + passes to preview**

In `app/pages/admin/invitations/[id]/edit.vue`:
- After `const themeId = ref(...)`, add: `const themeKey = ref<string>((data.value as any).themeKey ?? 'base')`.
- In `switchTheme(newId)`, after finding `t`, also set the key:
```ts
async function switchTheme(newId: string) {
  const t = ((themesList.value as any[]) ?? []).find((x) => x.id === newId)
  if (t) { themeTokens.value = t.tokens; themeKey.value = t.key ?? 'base' }
  try { await $fetch(`/api/admin/invitations/${id}/theme`, { method: 'PATCH', body: { themeId: newId } }) } catch { /* non-fatal */ }
}
```
- Pass to the preview tag: add `:theme-key="themeKey"` to `<EditorPreview … />`.

- [ ] **Step 5: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0)
Run: `npx vitest run tests/components/SectionRenderer.test.ts tests/components/editor-preview.test.ts tests/components/InvitationRoot.test.ts tests/components/section-map-alignment.test.ts` (all pass — default `themeKey='base'` keeps existing behavior)
Run: `npx vitest run` (all pass)

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/SectionRenderer.vue app/components/invitation/InvitationRoot.vue app/components/editor/EditorPreview.vue "app/pages/admin/invitations/[id]/edit.vue"
git commit -m "feat: thread themeKey through SectionRenderer / InvitationRoot / EditorPreview / editor"
```

---

## Task 5: Seed the elegant theme + key

**Files:**
- Modify: `server/theme/curated-themes.ts`
- Modify: `server/db/seed.ts`
- Modify: `server/db/seed-themes.ts`

- [ ] **Step 1: Add `key` to CuratedTheme + an elegant entry**

In `server/theme/curated-themes.ts`:
- Extend the interface: `export interface CuratedTheme { name: string; key?: string; tokens: Pick<Tokens, 'color' | 'font'> }`.
- Append a new entry (after the existing five):
```ts
  {
    name: 'Elegant Noir',
    key: 'elegant',
    tokens: { color: { primary: '#1f2933', secondary: '#9aa5b1', bg: '#f7f5f2', text: '#2b2b2b', accent: '#b08d57' }, font: { heading: 'Playfair Display', body: 'EB Garamond' } },
  },
```
(Fonts from the allow-list; colours valid hex.)

- [ ] **Step 2: Seed inserts carry `key`**

In `server/db/seed.ts`, the `db.insert(themes).values(CURATED_THEMES.map(...))` mapping — add `key: t.key ?? 'base'`:
```ts
  const insertedThemes = await db.insert(themes)
    .values(CURATED_THEMES.map((t) => ({ name: t.name, key: t.key ?? 'base', tokens: t.tokens, previewImage: null })))
    .returning()
```

In `server/db/seed-themes.ts`, the insert — add `key: t.key ?? 'base'`:
```ts
    await db.insert(themes).values({ name: t.name, key: t.key ?? 'base', tokens: t.tokens, previewImage: null })
```

- [ ] **Step 3: Typecheck + curated-themes test**

Run: `npx vitest run tests/theme/curated-themes.test.ts` — PASS (the validity test checks each theme's hex + allow-listed fonts; Elegant Noir complies; first theme is still Radiant Love).
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0.

- [ ] **Step 4: Commit**

```bash
git add server/theme/curated-themes.ts server/db/seed.ts server/db/seed-themes.ts
git commit -m "feat: seed Elegant Noir theme (key=elegant) + key on all curated themes"
```

---

## Task 6: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Suite + typecheck**

Run: `npx vitest run` — all pass (prior 173 + theme-packs + elegant-sections + assemble cases).
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 2: Sanity**

Run:
```bash
ls app/components/invitation/themePacks.ts app/components/invitation/themes/elegant/HeroSection.vue server/db/migrations/0006_*.sql
grep -c "resolveSectionComponent" app/components/invitation/SectionRenderer.vue
grep -c "themeKey" server/utils/invitation.ts app/components/editor/EditorPreview.vue
grep -c "key: 'elegant'" server/theme/curated-themes.ts
```
Expected: files exist; SectionRenderer uses the resolver; themeKey present; elegant theme seeded.

- [ ] **Step 3: Commit any straggler (only if needed)**

```bash
git add -A && git commit -m "chore: finalize theme component packs iteration 1"
```
(Skip if clean. Remind the user: `npm run db:reset` — or `db:migrate` — to apply 0006 + seed the elegant theme, then pick "Elegant Noir" in the editor to see the new layout.)

---

## Self-Review (done at write time)

- **Spec §3 (themes.key migration):** Task 1. ✅
- **Spec §4 (resolver):** Task 2. ✅
- **Spec §5 (threading):** Task 3 (server: assemble/editor GET/themes list) + Task 4 (client: SectionRenderer/Root/Preview/editor). ✅
- **Spec §6 (elegant proof theme):** Task 2 (components) + Task 5 (seed row + key). ✅
- **Spec §7 (testing):** resolver + fallback + null (Task 2), elegant components (Task 2), assemble themeKey (Task 3), alignment unaffected (Task 4). ✅
- **Spec §9 success criteria:** 1→T2+T4+T5, 2→T4 (editor switch passes themeKey to preview; PATCH persists themeId→key), 3→content/presentation split inherent (same content prop, different component), 4→T2 pattern (themes/<key>/ + pack + DB row). ✅
- **Placeholder scan:** none.
- **Type consistency:** `resolveSectionComponent(themeKey: string, type: string)`; `themeKey` (string, default `'base'`) across SectionRenderer/InvitationRoot/EditorPreview/edit; `AssembledInvitation.themeKey`; `CuratedTheme.key?`. Theme list item now `{ id, name, key, tokens, previewImage }` consumed by `switchTheme` (`t.key`). ✅
- **No data migration:** dev DB reseeded; `themes.key` defaults `'base'`. ✅
- **Risk flagged:** Task 1 `db:generate` may prompt on non-TTY — hand-write the `ALTER TABLE themes ADD COLUMN key` migration mirroring 0005's meta handling if so. SectionRenderer gaining a `themeKey` prop defaults to `'base'`, so existing SectionRenderer/EditorPreview/InvitationRoot tests stay green.
```

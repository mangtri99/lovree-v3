# Phase 2b-fields (Custom Section "Informasi Tambahan") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `custom` section type — a titled list of `{ label, value }` multiline-text rows — so customers can add free-form content the fixed schemas don't cover.

**Architecture:** Pure additive change to the existing section model. A new registry entry (schema + label + field descriptors) makes `custom` a first-class section type that the editor, autosave, validation, and design cascade handle automatically; a new render component plus a `sectionComponents` map entry renders it. Multiple `custom` instances work for free (the document is an instance list with no per-type uniqueness). No endpoint, no migration — content lives in the `draft_document`/`published_document` JSONB.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Zod, Vitest + @vue/test-utils.

**Branch:** `feat/phase-2b-media` (continuation). No DB migration.

**Grounding facts:**
- `server/registry/sections.ts` holds `sectionRegistry` (each entry: `schema`, `label`, `fields`). `SECTION_TYPES = Object.keys(sectionRegistry)`. `validateContent(type, raw)` does `schema.safeParse(raw ?? {})`, returning `schema.parse({})` (all-defaults) on failure.
- `app/components/invitation/sectionComponents.ts` maps `type → component`; `SectionRenderer` resolves via it.
- `tests/components/section-map-alignment.test.ts` asserts every `SECTION_TYPES` entry has a component and vice-versa — it will FAIL once `custom` is in the registry but not yet mapped, then PASS after Task 2.
- The editor add-section buttons render `SECTION_TYPES`, so `custom` appears as "+ Informasi Tambahan" automatically; `ListControl` already supports `defaultItem`; `longtext` maps to a textarea control. No editor code changes.
- Field descriptor type `FieldDescriptor` already supports `defaultItem?` (added in 2b-media).
- Render style reference (`InfoSection.vue`): `<section class="px-6 py-12 ...">` with a heading using `font-family: var(--font-heading)`.

---

## File Structure

- Modify `server/registry/sections.ts` — add `customItemSchema`, `customSchema`, and the `custom` registry entry.
- Create `app/components/invitation/sections/CustomSection.vue` — render title + rows.
- Modify `app/components/invitation/sectionComponents.ts` — map `custom: CustomSection`.
- Tests: `tests/registry/sections.test.ts` (add cases), `tests/components/custom-section.test.ts` (new), `tests/components/section-map-alignment.test.ts` (already exists — used as a gate, no edit).

---

## Task 1: Registry `custom` section type

**Files:**
- Modify: `server/registry/sections.ts`
- Test: `tests/registry/sections.test.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Add to `tests/registry/sections.test.ts` (it imports `{ validateContent }` from `'../../server/registry/sections'`; confirm the import exists, otherwise add it):

```ts
describe('custom section', () => {
  it('defaults to an empty title and no rows', () => {
    const out = validateContent('custom', {})
    expect(out).toEqual({ title: '', items: [] })
  })
  it('preserves filled rows and defaults an empty row\'s fields (section not reset)', () => {
    const out = validateContent('custom', { title: 'Dress Code', items: [{ label: 'Pria', value: 'Batik' }, {}] })
    expect(out.title).toBe('Dress Code')
    expect(out.items).toEqual([{ label: 'Pria', value: 'Batik' }, { label: '', value: '' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts -t "custom section"`
Expected: FAIL — `custom` is not a registry type, so `sectionRegistry['custom']` is undefined and `validateContent('custom', …)` throws.

- [ ] **Step 3: Add the schema + registry entry**

In `server/registry/sections.ts`, add the schemas near the other section schemas (e.g. just before `export const sectionRegistry`):

```ts
const customItemSchema = z.object({
  label: z.string().default(''),
  value: z.string().default(''),
})
const customSchema = z.object({
  title: z.string().default(''),
  items: z.array(customItemSchema).default([]),
})
```

Add this entry inside the `sectionRegistry` object (place it after `footer` or anywhere in the object — order in the object determines the add-button order; placing it before `footer` keeps Footer last):

```ts
  custom: {
    schema: customSchema,
    label: 'Informasi Tambahan',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      items: {
        type: 'list' as const,
        label: 'Baris',
        defaultItem: { label: '', value: '' },
        itemFields: {
          label: { type: 'text' as const, label: 'Label' },
          value: { type: 'longtext' as const, label: 'Isi' },
        },
      },
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/registry/sections.test.ts -t "custom section"`
Expected: PASS.

- [ ] **Step 5: Run the full registry + document suites (catch alignment fallout)**

Run: `npx vitest run tests/registry tests/document`
Expected: registry/document tests PASS. (Note: `tests/components/section-map-alignment.test.ts` will now FAIL because `custom` has no component yet — that is expected and fixed in Task 2. Do NOT run the components suite as a gate here.)

- [ ] **Step 6: Commit**

```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: add custom (Informasi Tambahan) section type to the registry"
```

---

## Task 2: CustomSection render component + map entry

**Files:**
- Create: `app/components/invitation/sections/CustomSection.vue`
- Modify: `app/components/invitation/sectionComponents.ts`
- Test: `tests/components/custom-section.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/custom-section.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomSection from '../../app/components/invitation/sections/CustomSection.vue'

const content = (over = {}) => ({ title: 'Informasi Tambahan', items: [], ...over })

describe('CustomSection', () => {
  it('renders the title when set and a row label + value', () => {
    const w = mount(CustomSection, { props: { content: content({ items: [{ label: 'Dress Code', value: 'Batik' }] }) } })
    expect(w.text()).toContain('Informasi Tambahan')
    expect(w.text()).toContain('Dress Code')
    expect(w.text()).toContain('Batik')
  })
  it('hides the title when empty', () => {
    const w = mount(CustomSection, { props: { content: content({ title: '', items: [{ label: 'A', value: 'B' }] }) } })
    expect(w.find('h2').exists()).toBe(false)
  })
  it('skips a fully-empty row but keeps a label-only or value-only row', () => {
    const w = mount(CustomSection, { props: { content: content({ items: [{ label: '', value: '' }, { label: 'Hanya Label', value: '' }] }) } })
    expect(w.findAll('[data-row]').length).toBe(1)
    expect(w.text()).toContain('Hanya Label')
  })
  it('preserves multiline values via whitespace-pre-line', () => {
    const w = mount(CustomSection, { props: { content: content({ items: [{ label: 'Catatan', value: 'baris1\nbaris2' }] }) } })
    const valueEl = w.find('[data-value]')
    expect(valueEl.classes()).toContain('whitespace-pre-line')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/custom-section.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

Create `app/components/invitation/sections/CustomSection.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
type Row = { label: string; value: string }
const props = defineProps<{ content: { title: string; items: Row[] } }>()
const rows = computed(() => (props.content.items ?? []).filter((r) => (r.label ?? '') !== '' || (r.value ?? '') !== ''))
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 v-if="content.title" class="text-xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="mx-auto mt-4 max-w-md space-y-3">
      <div v-for="(row, i) in rows" :key="i" data-row>
        <p v-if="row.label" class="font-semibold">{{ row.label }}</p>
        <p v-if="row.value" data-value class="whitespace-pre-line text-sm">{{ row.value }}</p>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Map the component**

In `app/components/invitation/sectionComponents.ts`, add the import and the map entry:

```ts
import CustomSection from './sections/CustomSection.vue'
```
and add `custom: CustomSection` to the `sectionComponents` object (e.g. at the end):

```ts
export const sectionComponents: Record<string, any> = {
  hero: HeroSection, opening: OpeningSection, couple: CoupleSection, event: EventSection,
  countdown: CountdownSection, quote: QuoteSection, love_gift: LoveGiftSection, gallery: GallerySection,
  closing: ClosingSection, info: InfoSection, rsvp: RsvpSection, guestbook: GuestbookSection, footer: FooterSection,
  custom: CustomSection,
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/custom-section.test.ts tests/components/section-map-alignment.test.ts`
Expected: PASS (component cases + both alignment directions now satisfied).

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/sections/CustomSection.vue app/components/invitation/sectionComponents.ts tests/components/custom-section.test.ts
git commit -m "feat: render CustomSection and map the custom section type"
```

---

## Task 3: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 126 + the new registry + custom-section cases). Zero failures. The previously-expected `section-map-alignment` failure from Task 1 is now resolved.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Sanity grep**

Run:
```bash
grep -n "custom:" server/registry/sections.ts app/components/invitation/sectionComponents.ts
```
Expected: a match in both files (registry entry + component map).

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize phase 2b-fields"
```

(Skip if the tree is already clean.)

---

## Self-Review (done at write time)

- **Spec §4 (registry entry):** Task 1. ✅
- **Spec §5 (render component + map):** Task 2. ✅
- **Spec §6 (editor — no code):** confirmed; nothing to build (the registry entry drives the editor automatically). ✅
- **Spec §7 (testing):** pure `validateContent('custom')` (Task 1), component render incl. empty-title/empty-row/multiline (Task 2), alignment gate (Task 2 Step 5). ✅
- **Spec §9 success criteria:** 1→T1+T2 (renders in preview/publish via the shared renderer), 2→native multi-instance (no code; covered by the instance-list model, exercised implicitly), 3→T2 (empty title/row skipped, `whitespace-pre-line`), 4→T1 (per-row defaults, empty row not dropped/section not reset). ✅
- **Placeholder scan:** none.
- **Type consistency:** `custom` content shape `{ title: string; items: { label: string; value: string }[] }` identical in schema (T1), component props (T2), and tests. `defaultItem: { label: '', value: '' }` matches `customItemSchema` defaults. ✅
- **Ordering note for the implementer:** Task 1 intentionally leaves `section-map-alignment` red until Task 2 — Task 1's gate runs only `tests/registry tests/document`, not the components suite. This is called out in Task 1 Step 5.
- **No migration / no endpoint:** content is JSONB in the document. ✅
```

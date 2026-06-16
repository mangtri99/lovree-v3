# Visual Theme Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the theme `USelect` in the create-invitation modal and the editor with a visual picker — a grid of cards, each a live mini mockup styled with that theme's own tokens.

**Architecture:** `ThemePreviewCard` computes its CSS vars from `theme.tokens` via the pure `resolveTokens`/`tokensToCssVars` utilities and styles a mini mockup (couple name in heading font, ornament divider glyph, colour swatches). `ThemePicker` renders a selectable grid of cards and emits the chosen id. Both the create modal and editor swap their `USelect` for `ThemePicker`; the editor's existing `watch(themeId)` → live-preview + PATCH is untouched.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-16-theme-picker-preview-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

---

## File Structure

- `app/components/theme/ThemePreviewCard.vue` (create) — one themed mini-mockup card.
- `app/components/theme/ThemePicker.vue` (create) — selectable grid of cards.
- `app/pages/admin/invitations/index.vue` (modify) — create-modal: `USelect` → `ThemePicker`.
- `app/pages/admin/invitations/[id]/edit.vue` (modify) — editor: `USelect` → `ThemePicker`.
- Tests: `tests/components/theme-preview-card.test.ts`, `tests/components/theme-picker.test.ts` (create).

Both pickers already receive themes (with `tokens`) from `GET /api/admin/themes`. The tokens utilities import from `~~/server/theme/tokens` (pure TS — already imported client-side elsewhere, e.g. the editor).

---

### Task 1: ThemePreviewCard

**Files:**
- Create: `app/components/theme/ThemePreviewCard.vue`
- Test: `tests/components/theme-preview-card.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/theme-preview-card.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemePreviewCard from '../../app/components/theme/ThemePreviewCard.vue'

const theme = (over: any = {}) => ({
  id: 't1',
  name: 'Dark Prada',
  tokens: {
    color: { primary: '#fcc889', secondary: '#3a3a3a', bg: '#1b1a17', text: '#fbfbfb', accent: '#b2d0df' },
    font: { heading: 'Courgette', body: 'DM Sans' },
    ornament: { divider: 'flourish', motif: 'none' },
    ...over,
  },
})

describe('ThemePreviewCard', () => {
  it('shows the theme name and a couple-name sample', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: false } })
    expect(w.text()).toContain('Dark Prada')
    expect(w.text()).toContain('Budi & Ani')
  })
  it('applies the theme bg as a css var on the card', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: false } })
    expect(w.html()).toContain('--color-bg: #1b1a17')
  })
  it('renders five colour swatches', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: false } })
    expect(w.findAll('[data-swatch]').length).toBe(5)
  })
  it('renders a flourish svg, and none when divider=none', () => {
    expect(mount(ThemePreviewCard, { props: { theme: theme(), selected: false } }).find('svg').exists()).toBe(true)
    const none = mount(ThemePreviewCard, { props: { theme: theme({ ornament: { divider: 'none', motif: 'none' } }), selected: false } })
    expect(none.find('svg').exists()).toBe(false)
  })
  it('marks the selected state', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: true } })
    expect(w.find('button').classes()).toContain('ring-2')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/theme-preview-card.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/components/theme/ThemePreviewCard.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { resolveTokens, tokensToCssVars } from '~~/server/theme/tokens'

defineOptions({ name: 'ThemePreviewCard' })
const props = defineProps<{ theme: { id: string; name: string; tokens: any }; selected: boolean }>()

const resolved = computed(() => resolveTokens(props.theme.tokens ?? {}, {}))
const styleStr = computed(() =>
  Object.entries(tokensToCssVars(resolved.value)).map(([k, v]) => `${k}: ${v}`).join('; '))
const divider = computed(() => resolved.value.ornament.divider)
const swatches = ['primary', 'secondary', 'bg', 'text', 'accent'] as const
</script>

<template>
  <button
    type="button"
    class="block w-full overflow-hidden rounded-lg border border-default text-left transition hover:-translate-y-0.5 hover:shadow-md"
    :class="{ 'ring-2 ring-offset-1': selected }"
    :style="styleStr"
  >
    <div class="px-4 py-6 text-center" style="background: var(--color-bg)">
      <p class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Budi &amp; Ani</p>
      <div v-if="divider === 'flourish'" class="mt-2 flex justify-center" style="color: var(--color-primary)">
        <svg width="64" height="10" viewBox="0 0 64 10" fill="none" aria-hidden="true">
          <line x1="4" y1="5" x2="26" y2="5" stroke="currentColor" stroke-width="1" />
          <path d="M32 1 L35 5 L32 9 L29 5 Z" fill="currentColor" />
          <line x1="38" y1="5" x2="60" y2="5" stroke="currentColor" stroke-width="1" />
        </svg>
      </div>
      <div v-else-if="divider === 'line'" class="mx-auto mt-2 h-px w-10" style="background: var(--color-secondary)" />
      <div class="mt-3 flex justify-center gap-1.5">
        <span
          v-for="k in swatches" :key="k" data-swatch
          class="h-3 w-3 rounded-full ring-1 ring-black/10"
          :style="{ background: `var(--color-${k})` }"
        />
      </div>
    </div>
    <div class="flex items-center justify-between bg-default px-3 py-2">
      <span class="text-sm font-medium text-highlighted">{{ theme.name }}</span>
      <span v-if="selected" class="text-primary" aria-label="terpilih">✓</span>
    </div>
  </button>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/theme-preview-card.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add app/components/theme/ThemePreviewCard.vue tests/components/theme-preview-card.test.ts
git commit -m "feat: ThemePreviewCard (live token mini-mockup)"
```

---

### Task 2: ThemePicker

**Files:**
- Create: `app/components/theme/ThemePicker.vue`
- Test: `tests/components/theme-picker.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/theme-picker.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemePicker from '../../app/components/theme/ThemePicker.vue'

const tk = (over: any = {}) => ({ color: { primary: '#111', secondary: '#222', bg: '#333', text: '#444', accent: '#555' }, font: { heading: 'Cinzel', body: 'Lora' }, ornament: { divider: 'line', motif: 'none' }, ...over })
const themes = [
  { id: 'a', name: 'Alpha', tokens: tk() },
  { id: 'b', name: 'Beta', tokens: tk() },
]

describe('ThemePicker', () => {
  it('renders a card per theme', () => {
    const w = mount(ThemePicker, { props: { themes, modelValue: 'a' } })
    expect(w.findAllComponents({ name: 'ThemePreviewCard' }).length).toBe(2)
  })
  it('marks the card matching modelValue as selected', () => {
    const w = mount(ThemePicker, { props: { themes, modelValue: 'b' } })
    const cards = w.findAllComponents({ name: 'ThemePreviewCard' })
    expect(cards[1].props('selected')).toBe(true)
    expect(cards[0].props('selected')).toBe(false)
  })
  it('emits update:modelValue with the clicked theme id', async () => {
    const w = mount(ThemePicker, { props: { themes, modelValue: 'a' } })
    await w.findAll('button')[1].trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual(['b'])
  })
  it('renders nothing for empty themes', () => {
    const w = mount(ThemePicker, { props: { themes: [], modelValue: '' } })
    expect(w.findAllComponents({ name: 'ThemePreviewCard' }).length).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/theme-picker.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/components/theme/ThemePicker.vue`:

```vue
<script setup lang="ts">
import ThemePreviewCard from './ThemePreviewCard.vue'

defineOptions({ name: 'ThemePicker' })
defineProps<{ themes: Array<{ id: string; name: string; tokens: any }>; modelValue: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <ThemePreviewCard
      v-for="t in themes" :key="t.id"
      :theme="t" :selected="t.id === modelValue"
      @click="$emit('update:modelValue', t.id)"
    />
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/theme-picker.test.ts`
Expected: PASS (4). (`ThemePreviewCard`'s root is a `<button>`; its native click bubbles to the `@click` listener on the component.)

- [ ] **Step 5: Commit**

```bash
git add app/components/theme/ThemePicker.vue tests/components/theme-picker.test.ts
git commit -m "feat: ThemePicker (selectable grid of theme cards)"
```

---

### Task 3: Swap the pickers in both pages

**Files:**
- Modify: `app/pages/admin/invitations/index.vue`, `app/pages/admin/invitations/[id]/edit.vue`

(No new unit test — page wiring verified by typecheck + suite; components are tested in Tasks 1–2.)

- [ ] **Step 1: Create modal (`index.vue`)**

Add the import alongside the existing top-of-`<script setup>` imports:

```ts
import ThemePicker from '~/components/theme/ThemePicker.vue'
```

Replace the theme field block (currently):

```vue
            <UFormField label="Tema" required>
              <USelect v-model="themeId" :items="themeItems" class="w-full" />
            </UFormField>
```

with:

```vue
            <UFormField label="Tema" required>
              <ThemePicker :themes="(themes as any[]) ?? []" v-model="themeId" />
            </UFormField>
```

(`themes` is the existing `useFetch('/api/admin/themes')` result; `themeId` already feeds the POST + first-theme default. If `themeItems` is now unused anywhere in the file, delete its `computed`.)

- [ ] **Step 2: Editor (`edit.vue`)**

Add the import alongside the other component imports (near `import SeoSettings …`):

```ts
import ThemePicker from '~/components/theme/ThemePicker.vue'
```

Replace the editor theme field block (currently):

```vue
                  <UFormField label="Tema">
                    <USelect v-model="themeId" :items="themeItems" class="w-full" />
                  </UFormField>
```

with:

```vue
                  <UFormField label="Tema">
                    <ThemePicker :themes="(themesList as any[]) ?? []" v-model="themeId" />
                  </UFormField>
```

(Leave the surrounding `<div class="rounded border …">` wrapper and `watch(themeId, …) → switchTheme()` exactly as they are. If `themeItems` is now unused, delete its `computed`.)

- [ ] **Step 3: Typecheck + suite**

Run: `npx nuxt typecheck`
Expected: exit 0. (If a `themeItems` removal left an unused var or vice-versa, fix.)
Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/invitations/index.vue app/pages/admin/invitations/[id]/edit.vue
git commit -m "feat: use visual ThemePicker in create modal + editor"
```

---

### Task 4: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + theme-preview-card 5 + theme-picker 4).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: both the create modal and editor show the visual theme grid; each card previews the theme's colours/heading-font/divider; selecting persists as before. Note: needs no DB change; the cards reflect whatever themes the DB holds (run `db:reset` if the new Dark Prada / token values aren't seeded yet to see them). Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3.1 ThemePreviewCard → Task 1; §3.2 ThemePicker → Task 2; §4 integration → Task 3; §5 testing → Tasks 1–2 + Task 4 gate. All covered.
- **Type consistency:** `theme: { id, name, tokens }` shape identical across both components and both call sites; `ThemePicker` emits `update:modelValue: [string]` consumed by `v-model="themeId"` (string) in both pages.
- **Selection plumbing:** card native `<button>` click bubbles to `@click` on `<ThemePreviewCard>` in `ThemePicker` → emits id → `v-model` updates `themeId`; editor's `watch(themeId)` then runs `switchTheme` unchanged (live preview + PATCH). Create modal just stores `themeId` for POST.
- **No data/endpoint change:** both pages already fetch `/api/admin/themes` with `tokens`; pure `~~/server/theme/tokens` import is client-safe (used elsewhere).
- **No nuxt env needed:** these components import only pure TS + render plain elements (no static `/assets`), so default happy-dom is fine.

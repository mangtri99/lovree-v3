# Wire radius + ornament Theme Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the inert `radius` + `ornament` (divider/motif) theme tokens drive real rendering — card roundness, a global between-section divider, and corner motifs — primarily elevating the base-pack themes.

**Architecture:** Per-theme token values live in `CURATED_THEMES` (type widened to allow `radius`/`ornament`). `OrnamentDivider.vue` renders a token-selected divider; `InvitationRoot` interleaves it between sections and renders a corner-motif overlay, reading the discrete values from the existing `cssVars` record (`--ornament-divider`/`--ornament-motif`). Base section cards consume `var(--radius-lg)`. Self-styled packs (`elegant`, `dark_prada`) opt out via `'none'`.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind, Vitest + @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-06-16-ornament-radius-tokens-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Operational note:** `seed-themes.ts` is insert-only; the new token values on already-seeded themes need `db:reset` to apply (dev DB disposable). The agent does NOT run db scripts.

---

## File Structure

- `server/theme/curated-themes.ts` (modify) — widen `CuratedTheme.tokens`; add `radius`/`ornament` to all 7 themes.
- `server/theme/tokens.ts` (modify) — comment documenting allowed `divider`/`motif` values (no structural change).
- `app/components/invitation/OrnamentDivider.vue` (create) — token-selected divider.
- `app/components/invitation/InvitationRoot.vue` (modify) — `divider`/`motif` computeds, interleave divider in the section loop, corner-motif overlay.
- `app/components/invitation/sections/EventSection.vue`, `LoveGiftSection.vue` (modify) — card `border-radius: var(--radius-lg)`.
- Tests: `tests/theme/curated-themes.test.ts` (modify), `tests/components/ornament-divider.test.ts` (create), `tests/components/InvitationRoot.test.ts` (modify), `tests/components/radius-wiring.test.ts` (create).

---

### Task 1: Token type + per-theme values

**Files:**
- Modify: `server/theme/curated-themes.ts`, `server/theme/tokens.ts`
- Test: `tests/theme/curated-themes.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/theme/curated-themes.test.ts`, add (the file imports `CURATED_THEMES`):

```ts
describe('ornament + radius tokens', () => {
  const DIVIDERS = ['none', 'line', 'flourish']
  const MOTIFS = ['none', 'corners']
  it('every theme declares valid ornament divider/motif', () => {
    for (const t of CURATED_THEMES) {
      expect(t.tokens.ornament, t.name).toBeTruthy()
      expect(DIVIDERS, `${t.name}.divider`).toContain(t.tokens.ornament!.divider)
      expect(MOTIFS, `${t.name}.motif`).toContain(t.tokens.ornament!.motif)
    }
  })
  it('radius values are pixel strings when present', () => {
    for (const t of CURATED_THEMES) {
      if (!t.tokens.radius) continue
      for (const k of ['sm', 'md', 'lg'] as const) expect(t.tokens.radius[k], `${t.name}.${k}`).toMatch(/^\d+px$/)
    }
  })
  it('self-styled packs opt out of divider + motif', () => {
    for (const name of ['Elegant Noir', 'Dark Prada']) {
      const t = CURATED_THEMES.find((x) => x.name === name)!
      expect(t.tokens.ornament!.divider).toBe('none')
      expect(t.tokens.ornament!.motif).toBe('none')
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/theme/curated-themes.test.ts`
Expected: FAIL — `tokens.ornament` undefined.

- [ ] **Step 3: Widen the type**

In `server/theme/curated-themes.ts`:

```ts
export interface CuratedTheme {
  name: string
  key?: string
  tokens: Pick<Tokens, 'color' | 'font'> & Partial<Pick<Tokens, 'radius' | 'ornament'>>
}
```

- [ ] **Step 4: Add radius/ornament to every theme**

Add to each theme's `tokens` object (alongside `color`/`font`):

- Radiant Love: `radius: { sm: '6px', md: '10px', lg: '16px' }, ornament: { divider: 'flourish', motif: 'corners' }`
- Rose Blush: `radius: { sm: '6px', md: '12px', lg: '20px' }, ornament: { divider: 'flourish', motif: 'corners' }`
- Emerald Garden: `radius: { sm: '4px', md: '8px', lg: '12px' }, ornament: { divider: 'line', motif: 'none' }`
- Midnight Gold: `radius: { sm: '2px', md: '2px', lg: '2px' }, ornament: { divider: 'line', motif: 'corners' }`
- Dusty Blue: `radius: { sm: '4px', md: '8px', lg: '12px' }, ornament: { divider: 'line', motif: 'none' }`
- Elegant Noir: `radius: { sm: '2px', md: '2px', lg: '2px' }, ornament: { divider: 'none', motif: 'none' }`
- Dark Prada: `radius: { sm: '4px', md: '8px', lg: '12px' }, ornament: { divider: 'none', motif: 'none' }`

- [ ] **Step 5: Document the vocabulary in tokens.ts**

In `server/theme/tokens.ts`, replace the `ornament` line of the `Tokens` interface with a documented version:

```ts
  // divider: 'none' | 'line' | 'flourish'; motif: 'none' | 'corners'
  ornament: { motif: string; divider: string }
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/theme/curated-themes.test.ts`
Expected: PASS (existing validity + 3 new).

- [ ] **Step 7: Commit**

```bash
git add server/theme/curated-themes.ts server/theme/tokens.ts tests/theme/curated-themes.test.ts
git commit -m "feat: per-theme radius + ornament token values"
```

---

### Task 2: OrnamentDivider component

**Files:**
- Create: `app/components/invitation/OrnamentDivider.vue`
- Test: `tests/components/ornament-divider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ornament-divider.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OrnamentDivider from '../../app/components/invitation/OrnamentDivider.vue'

describe('OrnamentDivider', () => {
  it('line renders a rule, no svg', () => {
    const w = mount(OrnamentDivider, { props: { variant: 'line' } })
    expect(w.find('.h-px').exists()).toBe(true)
    expect(w.find('svg').exists()).toBe(false)
  })
  it('flourish renders an svg', () => {
    const w = mount(OrnamentDivider, { props: { variant: 'flourish' } })
    expect(w.find('svg').exists()).toBe(true)
  })
  it('none / unknown renders nothing', () => {
    expect(mount(OrnamentDivider, { props: { variant: 'none' } }).html()).toBe('<!--v-if-->')
    expect(mount(OrnamentDivider, { props: { variant: 'zzz' } }).html()).toBe('<!--v-if-->')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/ornament-divider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/components/invitation/OrnamentDivider.vue`:

```vue
<script setup lang="ts">
defineOptions({ name: 'OrnamentDivider' })
defineProps<{ variant: string }>()
</script>
<template>
  <div v-if="variant === 'line'" class="mx-auto my-10 h-px w-16" style="background: var(--color-secondary)" />
  <div v-else-if="variant === 'flourish'" class="my-10 flex justify-center" style="color: var(--color-primary)">
    <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true">
      <line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" />
      <circle cx="58" cy="8" r="1.5" fill="currentColor" />
      <path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" />
      <circle cx="74" cy="8" r="1.5" fill="currentColor" />
      <line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" />
    </svg>
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/ornament-divider.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/OrnamentDivider.vue tests/components/ornament-divider.test.ts
git commit -m "feat: OrnamentDivider (none/line/flourish)"
```

---

### Task 3: Interleave divider + corner-motif overlay in InvitationRoot

**Files:**
- Modify: `app/components/invitation/InvitationRoot.vue`
- Test: `tests/components/InvitationRoot.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/components/InvitationRoot.test.ts` (already `// @vitest-environment nuxt`), add. Note the shared `data` has 2 sections; create local variants with the ornament cssVars:

```ts
  it('renders n-1 dividers between sections when divider=line', async () => {
    const d = { ...data, cssVars: { ...data.cssVars, '--ornament-divider': 'line' } }
    const w = mount(InvitationRoot, { props: { data: d, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAllComponents({ name: 'OrnamentDivider' }).length).toBe(1) // 2 sections -> 1 divider
  })
  it('renders 4 corner motifs when motif=corners (after open)', async () => {
    const d = { ...data, cssVars: { ...data.cssVars, '--ornament-motif': 'corners' } }
    const w = mount(InvitationRoot, { props: { data: d, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAll('[data-motif-corner]').length).toBe(4)
  })
  it('renders no motif corners when motif is absent/none', async () => {
    const w = mount(InvitationRoot, { props: { data, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAll('[data-motif-corner]').length).toBe(0)
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/InvitationRoot.test.ts`
Expected: FAIL — no `OrnamentDivider`/`[data-motif-corner]`.

- [ ] **Step 3: Implement**

In `InvitationRoot.vue` `<script setup>`: add the import and computeds (near `hero`):

```ts
import OrnamentDivider from './OrnamentDivider.vue'

const divider = computed(() => props.data.cssVars['--ornament-divider'] ?? 'none')
const motif = computed(() => props.data.cssVars['--ornament-motif'] ?? 'none')
```

In the template, make the root relative and interleave the divider + add the overlay. Replace the existing `<div class="invitation min-h-screen" :style="styleStr">` block body with:

```vue
  <div class="invitation relative min-h-screen" :style="styleStr">
    <CoverModal v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
    <template v-if="opened">
      <template v-for="(s, i) in data.sections" :key="i">
        <OrnamentDivider v-if="i > 0" :variant="divider" />
        <SectionRenderer :section="s" :theme-key="data.themeKey ?? 'base'" />
      </template>
      <div v-if="motif === 'corners'" class="pointer-events-none absolute inset-0 z-20" style="color: var(--color-primary)">
        <svg v-for="c in 4" :key="c" data-motif-corner aria-hidden="true" width="56" height="56" viewBox="0 0 56 56" fill="none"
          class="absolute opacity-40"
          :class="['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'][c - 1]"
          :style="{ transform: ['none', 'scaleX(-1)', 'scaleY(-1)', 'scale(-1,-1)'][c - 1] }">
          <path d="M4 4 H30 M4 4 V30" stroke="currentColor" stroke-width="1" />
          <path d="M10 10 q 22 0 22 22" stroke="currentColor" stroke-width="1" fill="none" />
          <circle cx="4" cy="4" r="2" fill="currentColor" />
        </svg>
      </div>
      <MusicPlayer v-if="data.musicUrl" :src="data.musicUrl" :playing="opened" />
    </template>
  </div>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/InvitationRoot.test.ts`
Expected: PASS (existing 2 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/InvitationRoot.vue tests/components/InvitationRoot.test.ts
git commit -m "feat: token-driven between-section divider + corner motif overlay"
```

---

### Task 4: Radius wiring (base cards)

**Files:**
- Modify: `app/components/invitation/sections/EventSection.vue`, `app/components/invitation/sections/LoveGiftSection.vue`
- Test: `tests/components/radius-wiring.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/radius-wiring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Event from '../../app/components/invitation/sections/EventSection.vue'
import LoveGift from '../../app/components/invitation/sections/LoveGiftSection.vue'

describe('radius token wiring', () => {
  it('event card uses var(--radius-lg)', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'A', date: '', dateFormat: 'DD MMMM YYYY', timeStart: '', timeEnd: '', venue: '', mapsUrl: '' }] } } })
    expect(w.html()).toContain('border-radius: var(--radius-lg)')
  })
  it('love_gift card uses var(--radius-lg)', () => {
    const w = mount(LoveGift, { props: { content: { note: '', banks: [{ bank: 'BCA', number: '1', holder: 'X' }] } } })
    expect(w.html()).toContain('border-radius: var(--radius-lg)')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/radius-wiring.test.ts`
Expected: FAIL — cards still use `rounded-lg`, no inline radius var.

- [ ] **Step 3: Implement**

In `app/components/invitation/sections/EventSection.vue`, the card `div` (currently `class="rounded-lg p-6 text-center" style="background: var(--color-bg)"`): drop `rounded-lg` from the class and add the radius to the style:

```vue
    <div v-for="(e, i) in content.events" :key="i" class="p-6 text-center" style="background: var(--color-bg); border-radius: var(--radius-lg)">
```

In `app/components/invitation/sections/LoveGiftSection.vue`, the bank card `div` (currently `class="rounded-lg border p-4"`): drop `rounded-lg`, add the style:

```vue
      <div v-for="(b, i) in content.banks" :key="i" class="border p-4" style="border-radius: var(--radius-lg)">
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/radius-wiring.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/sections/EventSection.vue app/components/invitation/sections/LoveGiftSection.vue tests/components/radius-wiring.test.ts
git commit -m "feat: base Event/LoveGift cards use var(--radius-lg)"
```

---

### Task 5: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + curated 3 + ornament-divider 3 + InvitationRoot 3 + radius 2).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: `radius`/`ornament` tokens now render (card roundness, between-section divider, corner motif); base themes differ; elegant/dark_prada opt out. Flag the human prerequisite: run `npm run db:reset` so the updated per-theme token values reach the DB (insert-only seeder won't update existing rows), then visually verify a base-pack theme shows the flourish divider + corner motifs. Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 type/tokens.ts → Task 1; §4 OrnamentDivider → Task 2; §5 motif overlay + §6 section loop → Task 3; §7 radius → Task 4; §8 per-theme values → Task 1; §9 testing → Tasks 1–4 + Task 5 gate. All covered.
- **Value source consistency:** divider/motif read from `cssVars['--ornament-divider'|'--ornament-motif']` (Task 3) — the same vars `tokensToCssVars` emits from the `ornament` group set in Task 1. Radius consumed as `var(--radius-lg)` (Task 4), emitted from the `radius` group (Task 1).
- **Opt-out:** elegant/dark_prada set divider/motif `'none'` (Task 1), asserted in Task 1's test; their packs render their own ornaments, so no doubling.
- **No data-contract change:** `InvitationRoot` already receives `cssVars`; no loader/API edit. Radius sites limited to the two base components that actually hardcode `rounded-lg` (verified: Event, LoveGift).
- **Test env:** `InvitationRoot.test.ts` is already `// @vitest-environment nuxt` (pulls themePacks → dark_prada static assets); OrnamentDivider/radius tests are asset-free and run under default happy-dom.

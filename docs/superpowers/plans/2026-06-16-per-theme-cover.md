# Per-Theme Cover Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `elegant` and `dark_prada` themes their own cover-modal layouts via a `resolveCover(themeKey)` resolution (parallel to section packs), with base-pack themes keeping the existing token-styled `CoverModal`.

**Architecture:** A `covers` map + `resolveCover` in `themePacks.ts` returns the pack cover or falls back to base `CoverModal`. `InvitationRoot` renders the resolved cover as a dynamic `<component :is>` with the same props/`open` emit. Two new cover components (elegant, dark_prada) read CSS vars; dark_prada uses the vendored static ornaments.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind, Vitest + @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-06-16-per-theme-cover-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Note:** unrelated uncommitted WIP (`server/registry/starter-sections.ts`, `dark_prada/HeroSection.vue`, `MEMBER_SECTION.md`) causes 3 pre-existing `starter-sections` test failures — out of scope, do NOT touch or stage those files.

---

## File Structure

- `app/components/invitation/themes/elegant/CoverModal.vue` (create) — elegant cover (name `ElegantCover`).
- `app/components/invitation/themes/dark_prada/CoverModal.vue` (create) — dark_prada cover (name `DarkPradaCover`).
- `app/components/invitation/themePacks.ts` (modify) — `covers` map + `resolveCover`.
- `app/components/invitation/InvitationRoot.vue` (modify) — dynamic cover component.
- Tests: `tests/components/cover-modals.test.ts` (create), `tests/components/theme-packs.test.ts` (modify), `tests/components/InvitationRoot.test.ts` (modify).

---

### Task 1: Pack cover components + resolveCover

**Files:**
- Create: `app/components/invitation/themes/elegant/CoverModal.vue`, `app/components/invitation/themes/dark_prada/CoverModal.vue`
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/cover-modals.test.ts`, `tests/components/theme-packs.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/cover-modals.test.ts`:

```ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ElegantCover from '../../app/components/invitation/themes/elegant/CoverModal.vue'
import DarkPradaCover from '../../app/components/invitation/themes/dark_prada/CoverModal.vue'

const props = { title: 'Undangan Mepandes', coupleName: 'Putu & Kadek', guestName: 'Budi' }

for (const [name, Comp] of [['elegant', ElegantCover], ['dark_prada', DarkPradaCover]] as const) {
  describe(`${name} cover`, () => {
    it('renders couple + guest name', () => {
      const w = mount(Comp, { props })
      expect(w.text()).toContain('Putu & Kadek')
      expect(w.text()).toContain('Budi')
    })
    it('emits open on button click', async () => {
      const w = mount(Comp, { props })
      await w.find('button').trigger('click')
      expect(w.emitted('open')).toBeTruthy()
    })
  })
}
```

Add to `tests/components/theme-packs.test.ts` (already `// @vitest-environment nuxt`) — add the import at top and a describe:

```ts
import { resolveCover } from '../../app/components/invitation/themePacks'
import CoverModal from '../../app/components/invitation/CoverModal.vue'

describe('resolveCover', () => {
  it('returns the pack cover for elegant + dark_prada', () => {
    expect(resolveCover('elegant')).not.toBe(CoverModal)
    expect(resolveCover('elegant')).toBeTruthy()
    expect(resolveCover('dark_prada')).not.toBe(CoverModal)
  })
  it('falls back to base CoverModal for base/unknown', () => {
    expect(resolveCover('base')).toBe(CoverModal)
    expect(resolveCover('nope')).toBe(CoverModal)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/components/cover-modals.test.ts tests/components/theme-packs.test.ts`
Expected: FAIL — cover modules + `resolveCover` not found.

- [ ] **Step 3: Create `themes/elegant/CoverModal.vue`**

```vue
<script setup lang="ts">
defineOptions({ name: 'ElegantCover' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <div>
      <p class="text-xs uppercase tracking-[0.3em]" style="color: var(--color-secondary)">{{ title }}</p>
      <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
      <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
      <p class="mt-2 text-sm">Kepada Yth.</p>
      <p class="text-lg">{{ guestName }}</p>
      <button type="button" class="mt-8 border px-8 py-3 text-sm uppercase tracking-[0.2em]" style="border-color: var(--color-primary); color: var(--color-primary)" @click="$emit('open')">Buka Undangan</button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Create `themes/dark_prada/CoverModal.vue`**

```vue
<script setup lang="ts">
defineOptions({ name: 'DarkPradaCover' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-hidden px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img src="/assets/dark-prada/ornament/hero-tl.svg" alt="" class="pointer-events-none absolute left-0 top-0 w-28" />
    <img src="/assets/dark-prada/ornament/hero-tr.svg" alt="" class="pointer-events-none absolute right-0 top-0 w-28" />
    <img src="/assets/dark-prada/ornament/hero-bl.svg" alt="" class="pointer-events-none absolute bottom-0 left-0 w-28" />
    <img src="/assets/dark-prada/ornament/hero-br.svg" alt="" class="pointer-events-none absolute bottom-0 right-0 w-28" />
    <div class="relative z-10">
      <p class="text-xs uppercase tracking-[0.3em]">{{ title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <p class="mt-6 text-sm">Kepada Yth.</p>
      <p class="text-lg">{{ guestName }}</p>
      <button type="button" class="mt-8 rounded-full px-8 py-3 text-sm" style="background: var(--color-primary); color: var(--color-bg)" @click="$emit('open')">Buka Undangan</button>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Add `covers` + `resolveCover` to `themePacks.ts`**

Add imports (with the other imports) and the resolver (near `resolveSectionComponent`):

```ts
import CoverModal from './CoverModal.vue'
import ElegantCover from './themes/elegant/CoverModal.vue'
import DarkPradaCover from './themes/dark_prada/CoverModal.vue'

const covers: Record<string, any> = { elegant: ElegantCover, dark_prada: DarkPradaCover }

export function resolveCover(themeKey: string): any {
  return covers[themeKey] ?? CoverModal
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run tests/components/cover-modals.test.ts tests/components/theme-packs.test.ts`
Expected: PASS (cover-modals 4, theme-packs existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add app/components/invitation/themes/elegant/CoverModal.vue app/components/invitation/themes/dark_prada/CoverModal.vue app/components/invitation/themePacks.ts tests/components/cover-modals.test.ts tests/components/theme-packs.test.ts
git commit -m "feat: per-theme cover components + resolveCover (elegant/dark_prada)"
```

---

### Task 2: Wire the dynamic cover into InvitationRoot

**Files:**
- Modify: `app/components/invitation/InvitationRoot.vue`
- Test: `tests/components/InvitationRoot.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/components/InvitationRoot.test.ts` (already `// @vitest-environment nuxt`):

```ts
  it('renders the dark_prada cover when themeKey is dark_prada', () => {
    const d = { ...data, themeKey: 'dark_prada' }
    const w = mount(InvitationRoot, { props: { data: d, guestName: 'Budi' } })
    expect(w.findComponent({ name: 'DarkPradaCover' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'CoverModal' }).exists()).toBe(false)
  })
```

(The existing tests use `data` without `themeKey` → base `CoverModal`, so `findComponent({ name: 'CoverModal' })` still passes there.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/InvitationRoot.test.ts`
Expected: FAIL — no `DarkPradaCover` (still hardcoded `CoverModal`).

- [ ] **Step 3: Implement**

In `app/components/invitation/InvitationRoot.vue` `<script setup>`:
- Remove the direct `import CoverModal from './CoverModal.vue'` (it's now resolved via `themePacks`).
- Add the resolver import and a computed (near the other imports / `hero` computed):

```ts
import { resolveCover } from './themePacks'

const cover = computed(() => resolveCover(props.data.themeKey ?? 'base'))
```

In the template, replace:

```vue
    <CoverModal v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
```

with:

```vue
    <component :is="cover" v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
```

(Leave the opened/scroll-lock logic, the section loop, divider/motif overlay, and MusicPlayer unchanged.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/InvitationRoot.test.ts`
Expected: PASS (existing cover/divider/motif tests + the new dark_prada cover one).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/InvitationRoot.vue tests/components/InvitationRoot.test.ts
git commit -m "feat: InvitationRoot renders the theme-resolved cover"
```

---

### Task 3: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass EXCEPT the 3 pre-existing `tests/registry/starter-sections.test.ts` failures (unrelated WIP). Confirm no NEW failures and that cover-modals/theme-packs/InvitationRoot are green.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: `elegant` + `dark_prada` render their own cover; base-pack themes keep the base cover; `resolveCover` falls back to base. Reiterate the pre-existing starter-sections WIP failures are outside this work. Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 resolveCover → Task 1; §4 InvitationRoot → Task 2; §5 cover components → Task 1; §6 testing → Tasks 1–2 + Task 3 gate. All covered.
- **Naming for resolution/tests:** base cover keeps `name: 'CoverModal'`; pack covers are `ElegantCover` / `DarkPradaCover` — so `InvitationRoot.test.ts`'s base `findComponent({ name: 'CoverModal' })` still matches when no themeKey, and the new test finds `DarkPradaCover`.
- **Contract unchanged:** all three covers share props `{ title, coupleName, guestName }` + `open` emit; InvitationRoot passes the same props/handler to whichever resolves.
- **Test env:** cover-modals + theme-packs + InvitationRoot tests are (or become) `// @vitest-environment nuxt` because the dark_prada cover imports static `/assets` ornaments (the established gotcha). elegant cover is asset-free but shares the file's pragma.
- **No data/endpoint change;** `themeKey` already flows into `InvitationRoot` via `data.themeKey`.

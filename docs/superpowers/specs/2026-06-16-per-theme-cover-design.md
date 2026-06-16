# Lovree v3 — Design Spec: Per-Theme Cover Modal

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Theme component packs (`themePacks` / `resolveSectionComponent`), the `elegant` + `dark_prada` packs, the shared `CoverModal`, `InvitationRoot`. Same branch `feat/phase-2b-media`.
- **Scope:** Give the pack themes their own cover-modal layout. Add a `resolveCover(themeKey)` resolution parallel to section packs; create `elegant` and `dark_prada` cover components; the five base-pack themes keep the existing (token-styled) `CoverModal`.

## 1. Background & Goal

`CoverModal` is a single shared component rendered by `InvitationRoot` before the invitation opens. It's already token-styled (colours/fonts via CSS vars) but its **layout** is identical for every theme. The section packs (`elegant`, `dark_prada`) give those themes a distinct look for every section except the cover — so the cover feels off-theme (e.g. Dark Prada's ornate dark sections behind a plain cover).

**Goal:** The cover follows the pack: `elegant` and `dark_prada` render bespoke cover layouts; the base-pack themes continue with the base `CoverModal`. Same props/flow (`title`, `coupleName`, `guestName`; emits `open`).

## 2. Decisions carried in from brainstorming

- **Pack-scoped:** only `elegant` + `dark_prada` get a bespoke cover; the 5 base-pack themes share the base `CoverModal` (already differentiated by tokens). No bespoke cover per base theme.
- **Resolution mirrors sections:** a `covers` map + `resolveCover(themeKey)` in `themePacks.ts`, falling back to base `CoverModal`.
- Same component contract: props `{ title: string; coupleName: string; guestName: string }`, emits `open`. No change to the open/scroll-lock flow in `InvitationRoot`.
- `dark_prada` cover reuses the vendored static ornament assets (`/assets/dark-prada/ornament/hero-*.svg`).

## 3. Resolution (`app/components/invitation/themePacks.ts`)

- Import the base `CoverModal` and the two pack covers.
- Add a covers map + resolver:

```ts
import CoverModal from './CoverModal.vue'
import ElegantCover from './themes/elegant/CoverModal.vue'
import DarkPradaCover from './themes/dark_prada/CoverModal.vue'

const covers: Record<string, any> = { elegant: ElegantCover, dark_prada: DarkPradaCover }

export function resolveCover(themeKey: string): any {
  return covers[themeKey] ?? CoverModal
}
```

(Leave the existing `packs` / `resolveSectionComponent` untouched.)

## 4. `InvitationRoot.vue`

- Replace the hardcoded `<CoverModal … />` with a dynamic component:

```ts
import { resolveCover } from './themePacks'
const cover = computed(() => resolveCover(props.data.themeKey ?? 'base'))
```

```vue
<component :is="cover" v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
```

- The existing `CoverModal` import line can be dropped (it's now imported inside `themePacks.ts` for the fallback). Keep everything else (the `opened`/scroll-lock logic, the divider/motif overlay, sections) unchanged.
- **Note for tests:** `findComponent({ name: 'CoverModal' })` in `InvitationRoot.test.ts` still works for the base theme (the dynamic component resolves to `CoverModal` when `themeKey` is absent/base).

## 5. Pack cover components

Both take props `{ title, coupleName, guestName }`, emit `open`, are `position: fixed inset-0 z-50` overlays, and read CSS vars. `defineOptions({ name: 'CoverModal' })` is NOT set on the pack covers (they get their own names so resolution/tests can distinguish — name them `ElegantCover` / `DarkPradaCover`).

### 5.1 `app/components/invitation/themes/elegant/CoverModal.vue`
- Refined/editorial: centered, `var(--color-bg)` ground, eyebrow `title` in uppercase tracking, `coupleName` in `var(--font-heading)` italic + `var(--color-primary)`, a thin divider rule (`var(--color-secondary)`), "Kepada Yth." + `guestName`, an outline button (`border` in `var(--color-primary)`, text primary) emitting `open`.

### 5.2 `app/components/invitation/themes/dark_prada/CoverModal.vue`
- Dark luxury: `var(--color-bg)` ground, four corner ornaments (`/assets/dark-prada/ornament/hero-tl|tr|bl|br.svg`), `coupleName` in Courgette (`var(--font-heading)`) gold (`var(--color-primary)`), eyebrow `title`, "Kepada Yth." + `guestName` in light text, a filled gold button (`background: var(--color-primary)`) emitting `open`.

## 6. Testing

- **`resolveCover` (in `tests/components/theme-packs.test.ts`, already `// @vitest-environment nuxt`):** `resolveCover('elegant')` and `resolveCover('dark_prada')` return their pack covers (not the base); `resolveCover('base')` and `resolveCover('nope')` return the base `CoverModal`.
- **Pack cover components (`tests/components/cover-modals.test.ts`, new, `// @vitest-environment nuxt` because dark_prada uses static assets):** each of elegant + dark_prada cover renders `coupleName` + `guestName`, and clicking its button emits `open`.
- **`InvitationRoot.test.ts`:** existing cover assertions still pass (base theme resolves to `CoverModal`); optionally add: with `data.themeKey='dark_prada'`, the rendered cover is the dark_prada one (e.g. `findComponent({ name: 'DarkPradaCover' }).exists()`).
- Full suite green (excluding the unrelated pre-existing `starter-sections` WIP failures); typecheck clean.

## 7. Out of Scope

- Bespoke covers for the five base-pack themes (they keep the token-styled base cover).
- Changing cover props, the open transition/animation, or the scroll-lock flow.
- A cover for any future pack (add to the `covers` map when that pack is built).

## 8. Success Criteria

1. `elegant` and `dark_prada` invitations show a cover matching their theme (elegant refined; dark_prada dark with corner ornaments + gold Courgette).
2. Base-pack themes still show the base cover, token-styled.
3. The open/reveal flow is unchanged; `resolveCover` falls back to base for unknown/base keys.
4. Suite + typecheck green (modulo the pre-existing starter-sections WIP failures, which are outside this work).

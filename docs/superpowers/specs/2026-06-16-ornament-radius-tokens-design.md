# Lovree v3 — Design Spec: Wire `radius` + `ornament` Theme Tokens

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Phase 4 themes + token cascade (`resolveTokens` → `tokensToCssVars` → CSS vars on the invitation root), curated themes, theme component packs (`elegant`, `dark_prada`). Same branch `feat/phase-2b-media`.
- **Scope:** Activate the two token groups that are emitted as CSS vars but never consumed — `radius` (`sm/md/lg`) and `ornament` (`motif`, `divider`) — so themes differ in card roundness and decorative dividers/corner motifs. Closes Phase 4 deferred item #2 (radius/ornament theming + decorative divider).

## 1. Background & Goal

`tokensToCssVars` already emits `--radius-sm/md/lg` and `--ornament-motif`/`--ornament-divider` on the invitation root (`InvitationRoot`'s `styleStr`), but no component reads them, so they're inert. Themes currently differ only by colour + font (+ a bespoke component pack for `elegant`/`dark_prada`). The five light "base-pack" themes (Radiant Love, Rose Blush, Emerald Garden, Midnight Gold, Dusty Blue) render with the same hardcoded `rounded-lg` and no dividers, so they look samey.

**Goal:** Themes drive (a) card/element roundness via `--radius-*`, (b) a decorative between-section divider, and (c) optional corner motifs — primarily elevating the base-pack themes. Packs that style themselves (`elegant`, `dark_prada`) opt out via token value `'none'` so nothing doubles up.

## 2. Decisions carried in from brainstorming

- **All three wired:** radius, `ornament.divider`, `ornament.motif`.
- **Divider is global**, rendered once between sections in `InvitationRoot`'s section loop (`v-if="i > 0"`), not inside each section component.
- **Values come from `cssVars`, not a new data contract.** `InvitationRoot` already holds `props.data.cssVars` (a `Record<string,string>`); the divider/motif *values* are read from `cssVars['--ornament-divider']` / `cssVars['--ornament-motif']`. Radius is consumed as a normal CSS var (`var(--radius-lg)`) in component styles. No loader/API change.
- **Self-styled packs opt out:** `elegant` and `dark_prada` set `ornament.divider = 'none'` and `ornament.motif = 'none'` so the global divider/motif don't stack on their bespoke ornaments.
- **Enumerated string values** (kept as `string` in the type; components switch with a safe `'none'` default):
  - `divider`: `'none' | 'line' | 'flourish'`
  - `motif`: `'none' | 'corners'`
- Photos stay `rounded-full` (not tokenised). No migration (tokens are jsonb on the theme row; `resolveTokens` deep-merges over `baseTokens`).

## 3. Token type (`server/theme/curated-themes.ts`)

Widen `CuratedTheme` so a theme may set radius/ornament (still optional; `resolveTokens` fills the rest from `baseTokens`):

```ts
import type { Tokens } from './tokens'
export interface CuratedTheme {
  name: string
  key?: string
  tokens: Pick<Tokens, 'color' | 'font'> & Partial<Pick<Tokens, 'radius' | 'ornament'>>
}
```

`server/theme/tokens.ts`: no structural change; add a comment documenting the allowed `divider`/`motif` string values next to the `ornament` field.

## 4. `OrnamentDivider.vue` (new, `app/components/invitation/`)

- Prop: `variant: string` (one of `'none' | 'line' | 'flourish'`; anything else → render nothing).
- `'line'` → a thin centered rule:
  `<div class="mx-auto my-8 h-px w-16" style="background: var(--color-secondary)" />`
- `'flourish'` → a small centered SVG glyph tinted with the theme primary (a refined botanical/diamond motif), e.g. a ~40px-wide inline `<svg>` with `style="color: var(--color-primary)"` using `currentColor` strokes/fills, vertically padded (`my-8`).
- `'none'` / unknown → renders nothing (`<template v-if=…>`).
- Pure presentational; no props beyond `variant`.

## 5. Motif overlay (in `InvitationRoot.vue`)

- Compute `motif = computed(() => props.data.cssVars['--ornament-motif'] ?? 'none')` and `divider = computed(() => props.data.cssVars['--ornament-divider'] ?? 'none')`.
- When `motif === 'corners'`, render four absolutely-positioned corner flourishes inside the root container (a `pointer-events-none` overlay), each an inline SVG glyph at low opacity tinted `var(--color-primary)` (top-left, plus rotations for the other three corners). When `'none'`, render nothing.
- The overlay sits within `.invitation` (which carries the CSS vars), behind content (`z` low), not interfering with the cover modal.

## 6. Section loop (`InvitationRoot.vue`)

Replace the bare `v-for` with a divider-interleaved loop:

```vue
<template v-for="(s, i) in data.sections" :key="i">
  <OrnamentDivider v-if="i > 0" :variant="divider" />
  <SectionRenderer :section="s" :theme-key="data.themeKey ?? 'base'" />
</template>
```

(The divider only appears between sections, never before the first or after the last.)

## 7. Radius wiring (base section components)

Swap hardcoded card roundness for the token in the base pack only (the self-styled packs keep their own):
- `EventSection.vue`, `LoveGiftSection.vue` (bank cards), `CustomSection.vue` (if it has a card), `GallerySection.vue` (images), `RsvpSection.vue` (inputs/buttons): replace `rounded-lg` with an inline `style="border-radius: var(--radius-lg)"` (use `--radius-md` for smaller controls like inputs).
- Leave `rounded-full` (couple/member photos) untouched.
- Elegant/dark_prada components are out of scope here (they define their own look).

## 8. Per-theme values (`CURATED_THEMES`)

Set tokens so themes visibly differ (radius `lg` drives card roundness; `sm`/`md` follow):

| Theme | divider | motif | radius (sm/md/lg) |
|---|---|---|---|
| Radiant Love | flourish | corners | 6 / 10 / 16 |
| Rose Blush | flourish | corners | 6 / 12 / 20 |
| Emerald Garden | line | none | 4 / 8 / 12 |
| Midnight Gold | line | corners | 2 / 2 / 2 |
| Dusty Blue | line | none | 4 / 8 / 12 |
| Elegant Noir | none | none | 2 / 2 / 2 |
| Dark Prada | none | none | 4 / 8 / 12 |

Each entry adds a `radius: { sm:'<n>px', md:'<n>px', lg:'<n>px' }` and `ornament: { divider:'…', motif:'…' }` to its `tokens`. Themes that want the base radius may omit `radius` (falls back to base 4/8/16); the table values above are explicit for clarity.

## 9. Testing

- **`OrnamentDivider.vue`:** `variant='line'` renders the rule (`.h-px`); `'flourish'` renders an `<svg>`; `'none'` / unknown renders nothing.
- **Motif overlay / InvitationRoot:** with `cssVars['--ornament-motif']='corners'` the overlay renders SVG corner glyphs; with `'none'` it renders none. With multiple sections and `--ornament-divider='line'`, `n-1` dividers render between `n` sections; with `'none'`, zero dividers. (Mount `InvitationRoot` opened, in the nuxt vitest env since it pulls `themePacks`.)
- **Curated themes:** extend the validity test — every theme's `ornament.divider` ∈ {none,line,flourish} and `ornament.motif` ∈ {none,corners} (when present); any `radius` values are `\d+px`. `elegant` + `dark_prada` have `divider='none'` and `motif='none'`.
- **Radius wiring:** assert a base card component renders `border-radius: var(--radius-lg)` (string check) — or cover by typecheck + visual.
- Full suite green; typecheck clean.

## 10. Out of Scope

- New ornament/divider/motif styles beyond the enumerated values; per-section divider overrides; animated ornaments.
- Tokenising photo radius; radius on elegant/dark_prada packs.
- A picker/preview for these (Phase 4 deferred item #1) and theme CRUD (item #3).
- Migrations (jsonb tokens). **Operational note:** `seed-themes.ts` is insert-only (it skips any theme whose `name` already exists), so the new radius/ornament values on the **already-seeded** themes (Radiant Love, Rose Blush, Emerald, Midnight, Dusty Blue, Elegant Noir) will NOT apply via `db:seed:themes` — the user must run **`db:reset`** (dev DB is disposable) to re-seed with the updated tokens. Upgrading the seeder to upsert is out of scope.

## 11. Success Criteria

1. `--radius-*` and `--ornament-*` are consumed in render; changing a theme's radius visibly changes card roundness.
2. A theme with `ornament.divider='flourish'` shows a decorative glyph between sections; `'line'` shows a rule; `'none'` shows nothing.
3. A theme with `ornament.motif='corners'` shows corner flourishes; `elegant`/`dark_prada` show neither divider nor motif (no doubling on their bespoke styling).
4. Full suite + typecheck green.

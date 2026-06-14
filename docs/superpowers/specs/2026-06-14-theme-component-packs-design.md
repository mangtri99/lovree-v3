# Lovree v3 — Design Spec: Theme Component Packs (iteration 1)

- **Date:** 2026-06-14
- **Status:** Approved for planning
- **Builds on:** Phase 4 themes (token-only). Same branch `feat/phase-2b-media`.
- **Scope:** Let a theme define its own **layout** per section (different Vue components, à la the old Blade-per-Figma templates), not just colours/fonts. Iteration 1 builds the architecture: a theme `key`, a component-pack resolver with a `base` fallback, `themeKey` threaded through render (public + editor preview), and **one proof theme** (`elegant`) overriding the Hero + Couple sections. Full themed packs for every section come later.

## 1. Background & Goal

Today a "theme" is only design tokens; every invitation renders the SAME section components (`sectionComponents[type]`), so themes differ by palette/font only. The customer's previous Laravel system had a distinct Blade template per Figma design — genuinely different layouts. The content/presentation split here (content = JSONB data, presentation = components) makes per-theme layouts achievable: the same content can render through different component packs.

**Goal:** A theme selects a **layout pack**; sections it overrides render that pack's component, others fall back to the shared `base` pack. Switching theme in the editor changes layout (and palette) live; the published invitation renders the chosen layout. Adding a new design = writing Vue section components + one DB row (the `key`).

## 2. Decisions carried in from brainstorming

- **Layout vs palette are separate axes.** A theme row = `{ key (layout pack), tokens (palette) }`. Pack components read CSS vars, so a layout works with any palette.
- **`base` pack = the current components** (fallback). A theme overrides only the sections that differ; non-overridden sections render `base`.
- **Iteration 1 scope:** architecture + plumbing + extract nothing (base stays as-is) + ONE proof theme `elegant` overriding `hero` + `couple`. No full packs yet.
- Token-only curated themes keep `key = 'base'`.

## 3. Schema (migration 0006)

`themes`: add `key: text('key').notNull().default('base')`. Existing/seeded rows are `base`; the proof theme is `elegant`. (`db:generate`; on a non-TTY prompt, hand-write the `ALTER TABLE themes ADD COLUMN key text DEFAULT 'base' NOT NULL` migration.)

## 4. Pack resolver (`app/components/invitation/themePacks.ts`)

```ts
import { sectionComponents as base } from './sectionComponents'
import ElegantHero from './themes/elegant/HeroSection.vue'
import ElegantCouple from './themes/elegant/CoupleSection.vue'

// themeKey -> (sectionType -> component). A theme overrides only what differs; the
// rest falls back to the `base` pack (the shared components).
const packs: Record<string, Record<string, any>> = {
  elegant: { hero: ElegantHero, couple: ElegantCouple },
}

export function resolveSectionComponent(themeKey: string, type: string): any | null {
  return packs[themeKey]?.[type] ?? base[type] ?? null
}
```

## 5. Threading `themeKey`

- **`assembleInvitation(inv, theme, sections)`** (server/utils/invitation.ts): add `themeKey: theme?.key ?? 'base'` to the returned object; extend `AssembledInvitation` with `themeKey: string`. It flows to the public response (`{ ...assembled, … }`).
- **Editor GET** (`…/[id]/index.get.ts`): the handler already loads `theme`; add `themeKey: (theme as any)?.key ?? 'base'` to the response.
- **`GET /api/admin/themes`**: add `key: themes.key` to the selected columns.
- **`SectionRenderer.vue`**: add a `themeKey?: string` prop (default `'base'`); resolve via `resolveSectionComponent(props.themeKey ?? 'base', section.type)` instead of importing `sectionComponents` directly.
- **`InvitationRoot.vue`**: `data` gains `themeKey?: string`; pass `:theme-key="data.themeKey ?? 'base'"` to each `<SectionRenderer>`.
- **`EditorPreview.vue`**: add a `themeKey?: string` prop; pass it to each `<SectionRenderer :theme-key="themeKey">`.
- **Editor page** (`…/[id]/edit.vue`): hold `themeKey` (from the editor GET's `themeKey`); the existing theme switcher, on change, sets `themeKey.value = chosenTheme.key` (the themes list now includes `key`); pass `:theme-key="themeKey"` to `<EditorPreview>`. The preview re-renders with the pack live.

## 6. Proof theme `elegant`

- **Seed:** `CuratedTheme` gains an optional `key?: string`; `CURATED_THEMES` entries default to `base` (seed maps `key: t.key ?? 'base'`). Add one entry `{ name: 'Elegant Noir', key: 'elegant', tokens: { … palette … } }` (palette from valid hex; fonts from the allow-list). `seed.ts` + `seed-themes.ts` insert `key`.
- **Components:** `app/components/invitation/themes/elegant/HeroSection.vue` and `CoupleSection.vue` — same `content` props as the base components, but a **distinct layout** (e.g. Hero: large centered title with an ornamental divider and the date as an eyebrow; Couple: side-by-side framed cards). They read the same CSS vars (`--color-*`, `--font-*`) so the palette still cascades.

## 7. Testing

- **Pure:** `resolveSectionComponent('elegant','hero')` returns the elegant Hero; `('elegant','footer')` falls back to `base` footer; `('base','hero')` returns the base Hero; an unknown section type returns `null`. `assembleInvitation` returns `themeKey` from `theme.key` (and `'base'` when the theme/key is absent).
- **Component:** the elegant `HeroSection`/`CoupleSection` render their content (couple name/title; people names). `SectionRenderer` with `themeKey='elegant'` renders the elegant Hero for a `hero` section and the base component for a non-overridden type.
- `section-map-alignment` is unaffected (the `base` pack is still complete).
- Full suite green; typecheck clean.

## 8. Out of Scope (iteration 1)

- Full themed packs for every section / multiple new themes (later iterations).
- Theme CRUD UI (a theme's layout is code; CRUD would only tweak tokens — separate item).
- Per-theme cover/music styling; preview-image generation.
- Migrating existing invitations (dev DB reseeded).

## 9. Success Criteria

1. `base` themes (the curated five) render the current layout; the `elegant` theme renders a visibly different Hero + Couple, with all other sections falling back to base.
2. Switching theme in the editor changes both layout and palette in the live preview; the published `/u/:slug` renders the selected theme's layout.
3. The same invitation content renders through different layouts depending on the theme (content/presentation separation proven).
4. Adding a new layout theme = writing its section components under `themes/<key>/` + registering the pack + a DB theme row with that `key`.

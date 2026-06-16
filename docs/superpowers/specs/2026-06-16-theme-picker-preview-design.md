# Lovree v3 — Design Spec: Visual Theme Picker (live token preview)

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Phase 4 themes (`GET /api/admin/themes` already returns `tokens`), token cascade (`resolveTokens` → `tokensToCssVars`), the now-wired `radius`/`ornament` tokens, global Google Fonts load in `app/app.vue`. Same branch `feat/phase-2b-media`.
- **Scope:** Replace the plain theme `USelect` in the create-invitation modal and the editor with a visual picker — a grid of cards, each a live mini mockup styled with that theme's own tokens (colours, heading font, ornament divider). Closes Phase 4 deferred item #1. No stored preview images.

## 1. Background & Goal

Theme selection is a bare `USelect` (name only) in two places: the create-invitation modal (`app/pages/admin/invitations/index.vue`) and the editor's "tampilan" tab (`app/pages/admin/invitations/[id]/edit.vue`). The customer picks blind. `GET /api/admin/themes` already returns each theme's full `tokens` (color, font, radius, ornament), and Google Fonts are loaded app-wide in `app/app.vue`, so a faithful live preview can be rendered client-side with no image pipeline.

**Goal:** Both pickers show a grid of theme cards; each card is a small invitation mockup rendered in that theme's own colours + heading font + ornament divider, with the theme name and a colour-swatch row. Selecting a card sets the theme (create: into the POST body; editor: triggers the existing live-preview + PATCH).

## 2. Decisions carried in from brainstorming

- **Live token preview, no images.** Each card computes its CSS vars from `tokens` and styles itself; `previewImage` stays null and unused.
- **Mini themed mockup per card:** theme `bg`, a couple-name sample ("Budi & Ani") in `--font-heading` + `--color-primary`, a small ornament divider glyph reflecting `ornament.divider`, a 5-dot colour swatch (primary/secondary/bg/text/accent), and the theme name.
- **Shared component, both sites.** One `ThemePicker` (+ `ThemePreviewCard`) replaces both `USelect`s.
- **Fonts already global** (`app/app.vue` loads `googleFontsHref()`), so cards render real theme fonts in admin — no layout change.
- YAGNI: no search/filter, no CRUD, no preview-image generation.

## 3. Components

### 3.1 `ThemePreviewCard.vue` (new, `app/components/theme/`)
- Props: `{ theme: { id: string; name: string; tokens: any }, selected: boolean }`.
- Computes `vars = tokensToCssVars(resolveTokens(theme.tokens ?? {}, {}))` (import `resolveTokens`, `tokensToCssVars` from `~~/server/theme/tokens` — pure TS, no Nuxt runtime). Build an inline style string from `vars` and apply to the card body so inner elements can use `var(--color-…)` / `var(--font-heading)`.
- Layout (button element, full width, selectable):
  - Mockup panel: `style="background: var(--color-bg)"`, padded; "Budi & Ani" in `style="font-family: var(--font-heading); color: var(--color-primary)"`; a divider glyph row driven by `divider = resolveTokens(...).ornament.divider`:
    - `flourish` → a small inline SVG diamond/line glyph (`color: var(--color-primary)`),
    - `line` → a thin `var(--color-secondary)` rule,
    - `none` → omit.
  - Swatch row: five small rounded dots, each `style="background: var(--color-<k>)"` with a hairline border so `bg`/light dots stay visible.
  - Footer: theme `name` (normal admin text, outside the themed panel).
- `selected` → ring/outline using `var(--color-primary)` + a check indicator; hover → slight lift/shadow.
- Emits nothing (selection handled by parent click); it's presentational.

### 3.2 `ThemePicker.vue` (new, `app/components/theme/`)
- Props: `{ themes: Array<{ id; name; tokens }>; modelValue: string }`; emits `update:modelValue`.
- Renders a responsive grid (`grid grid-cols-2 gap-3`) of `ThemePreviewCard` (`:selected="t.id === modelValue"`); clicking a card emits `update:modelValue` with its id.
- Empty `themes` → renders nothing (no crash).

## 4. Integration

- **Create modal (`app/pages/admin/invitations/index.vue`):** replace the theme `UFormField`/`USelect` with `<ThemePicker :themes="(themes as any[]) ?? []" v-model="themeId" />` (keep the `UFormField label="Tema" required` wrapper). `themes` is already fetched with tokens; `themeId` already feeds the POST body and the first-theme default.
- **Editor (`app/pages/admin/invitations/[id]/edit.vue`):** replace the theme `USelect` with `<ThemePicker :themes="(themesList as any[]) ?? []" v-model="themeId" />`. The existing `watch(themeId, …) → switchTheme()` (live `themeTokens` update + `PATCH /theme`) keeps working unchanged.
- Both already call `GET /api/admin/themes` (returns `tokens`). The now-removed `themeItems` computeds may be deleted if unused after the swap.

## 5. Testing

- **`ThemePreviewCard.vue`:** renders the theme `name` and the "Budi & Ani" sample; renders five swatch dots; applies the theme `bg` as a CSS var on the themed panel (assert the style string contains `--color-bg: <hex>` from a sample theme's tokens); a theme with `ornament.divider='flourish'` renders an `<svg>`, `'none'` renders no divider glyph; `selected` adds the selected ring class.
- **`ThemePicker.vue`:** given two themes, renders two cards; clicking the second emits `update:modelValue` with its id; the card matching `modelValue` is marked selected.
- Pure component tests under happy-dom (the tokens utilities are pure TS; no static assets, so no nuxt env needed).
- Full suite green; typecheck clean.

## 6. Out of Scope

- Stored/generated preview images (`previewImage` remains null).
- Theme CRUD / per-user themes (Phase 4 deferred #3).
- Search, filtering, or categorising themes; reordering.
- Changing the theme data contract or the `GET /api/admin/themes` shape.

## 7. Success Criteria

1. Both the create modal and the editor show a grid of theme cards instead of a dropdown.
2. Each card is a live mini mockup in its own theme's colours + heading font + ornament divider, with a swatch row and the theme name.
3. Selecting a card sets the theme — create flows into the new invitation; editor live-updates the preview and persists (`PATCH /theme`) exactly as before.
4. Full suite + typecheck green.

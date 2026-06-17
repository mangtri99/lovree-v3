# Lovree v3 — Design Spec: Theme CRUD (custom themes)

- **Date:** 2026-06-17
- **Status:** Approved for planning
- **Builds on:** Phase 4 themes (curated themes + seeding + `GET /api/admin/themes`), the token cascade (`Tokens`, `resolveTokens`/`tokensToCssVars`), the font allow-list (`HEADING_FONTS`/`BODY_FONTS`), theme packs (`base`/`elegant`/`dark_prada`/`maroon`), `ThemePreviewCard`, admin per-setting endpoint conventions. Same branch `feat/phase-2b-media`.
- **Scope:** Let an admin create / edit / delete **custom themes** (full token set + layout pack) in a `/admin/themes` page, with curated themes read-only. Closes Phase 4 deferred item #3.

## 1. Background & Goal

Themes are a fixed curated set seeded from `CURATED_THEMES`; there's only a `GET` endpoint and no UI to manage them. The token model is complete (5 colours, 2 fonts, radius, ornament) and `key` selects a layout pack. A custom theme is just a `themes` row with chosen tokens + a pack `key` — no code needed.

**Goal:** An admin builds custom themes (name, layout pack, palette, fonts, radius, ornament) with a live preview, edits/deletes their custom themes, and uses them anywhere themes are picked. Curated/built-in themes stay read-only.

## 2. Decisions carried in from brainstorming

- **Global** themes (no per-user ownership), matching the current single-admin model. A `builtin` flag distinguishes seeded curated themes (read-only) from custom themes (editable/deletable).
- **Full token editing:** name, pack `key`, 5 colours, 2 fonts (from the allow-list), radius (sm/md/lg), ornament (divider/motif). A custom theme may combine any pack layout with its own palette/fonts.
- **Live preview** reuses `ThemePreviewCard` (renders from in-progress tokens).
- **Delete guards:** cannot delete a built-in theme; cannot delete a theme that an invitation currently uses (409).
- No per-user themes, no preview-image generation, no import/export/duplicate.

## 3. Schema (`server/db/schema.ts` + migration)

Add to the `themes` table:

```ts
builtin: boolean('builtin').notNull().default(false),
```

- `boolean` import from `drizzle-orm/pg-core` (add to the existing import if absent).
- Generate the migration with `npm run db:generate` → `server/db/migrations/000X_*.sql`. The agent does NOT run `db:migrate`/`db:reset`; the human applies it (dev DB disposable).

## 4. Seeding (`server/db/seed.ts`, `server/db/seed-themes.ts`)

- Both insert `CURATED_THEMES` with `builtin: true` (curated themes are read-only). Update the `.values(...)` mapping in each to include `builtin: true`.

## 5. Validator (`server/theme/validate-theme.ts`, new — pure)

```ts
export interface ThemeInput { name: string; key: string; tokens: unknown }
export type ThemeValidation = { ok: true; value: { name: string; key: string; tokens: Tokens } } | { ok: false; error: string }
export function validateThemeInput(input: ThemeInput): ThemeValidation
```

Rules (return `{ ok: false, error }` on the first failure):
- `name` non-empty (trimmed).
- `key` ∈ `['base', 'elegant', 'dark_prada', 'maroon']`.
- `tokens.color.{primary,secondary,bg,text,accent}` each match `/^#[0-9a-fA-F]{6}$/`.
- `tokens.font.heading` ∈ `HEADING_FONTS`; `tokens.font.body` ∈ `BODY_FONTS`.
- `tokens.radius.{sm,md,lg}` each match `/^\d+px$/`.
- `tokens.ornament.divider` ∈ `['none','line','flourish']`; `tokens.ornament.motif` ∈ `['none','corners']`.
- On success, return a normalized `tokens: Tokens` (only the known fields, trimmed name). Pure (imports `HEADING_FONTS`/`BODY_FONTS` + `Tokens` type only) → unit-testable, reused by POST + PATCH.

`PACK_KEYS` (the four selectable layout keys, with Indonesian labels for the UI) is exported here too for the form + validation:
```ts
export const PACK_KEYS = [
  { value: 'base', label: 'Standar' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'dark_prada', label: 'Dark Prada' },
  { value: 'maroon', label: 'Marun Klasik' },
] as const
```

## 6. Endpoints (`server/api/admin/themes…`)

All require `session.user?.id` (else 401), matching `themes.get.ts`.

- **`GET /api/admin/themes`** (modify): add `builtin: themes.builtin` to the select.
- **`POST /api/admin/themes`** (new): body `{ name, key, tokens }` → `validateThemeInput`; 400 on error; insert `{ name, key, tokens, builtin: false, previewImage: null }`; return the new row `{ id, name, key, tokens, builtin }`.
- **`PATCH /api/admin/themes/[id]`** (new): load the theme (404 if missing); if `builtin` → 403 "Tema bawaan tidak bisa diubah"; `validateThemeInput`; 400 on error; update `name/key/tokens`; return the row.
- **`DELETE /api/admin/themes/[id]`** (new): load (404 if missing); if `builtin` → 403; count invitations with `themeId = id` — if > 0 → 409 "Tema sedang dipakai undangan"; else delete; return `{ ok: true }`.

## 7. Admin page (`app/pages/admin/themes.vue`, new) + nav

- `definePageMeta({ layout: 'admin', middleware: 'admin' })`. Add a nav item `{ label: 'Tema', icon: 'i-lucide-palette', to: '/admin/themes' }` to `app/layouts/admin.vue`.
- Fetch `GET /api/admin/themes`. Render a responsive grid of cards; each card shows the `ThemePreviewCard` (live token preview) + the theme name; built-in cards show a "Bawaan" badge and no edit/delete; custom cards show Edit + Hapus buttons.
- A "+ Tema Baru" button opens the editor modal (`ThemeEditor`).

### 7.1 `ThemeEditor.vue` (new, `app/components/admin/` or `app/components/theme/`)
- Props: the theme being edited (or null for create) + `onSaved` callback.
- Reactive local `form = { name, key, tokens: { color{5}, font{heading,body}, radius{sm,md,lg}, ornament{divider,motif} } }`, seeded from the prop or from `baseTokens` for a new theme.
- Controls: name `UInput`; pack `USelect` (`PACK_KEYS`); five colour rows (`<input type="color">` + a hex `UInput`, kept in sync); heading/body `USelect` from `HEADING_FONTS`/`BODY_FONTS`; radius sm/md/lg `UInput` (px); ornament divider/motif `USelect` (`none/line/flourish`, `none/corners`).
- **Live preview:** a `ThemePreviewCard` bound to `{ id: 'preview', name: form.name || 'Pratinjau', tokens: form.tokens }` updates as the form changes.
- Save → `POST` (create) or `PATCH /:id` (edit); on success call `onSaved` (parent refetches); show the server error message (400/403/409) inline on failure.

## 8. Testing

- **`validateThemeInput` (`tests/theme/validate-theme.test.ts`, pure):**
  - A complete valid input → `{ ok: true, value }` with normalized tokens.
  - Rejects: empty name; bad `key`; a non-hex colour; a heading/body font not in the allow-list; a non-`px` radius; an out-of-enum divider/motif. Each → `{ ok: false }`.
- **Endpoints:** thin-shell — covered by typecheck + the suite. (Predicate-level: built-in guard returns 403, in-use guard returns 409 — assert the guard helpers if extracted, else rely on typecheck/manual.)
- **Component (`ThemeEditor.vue`):** renders the name/pack/colour/font/radius/ornament controls and a `ThemePreviewCard`; editing a colour updates the preview's CSS var; calls the save handler with the assembled `{ name, key, tokens }`.
- **Component (`themes.vue` list, light):** built-in themes show no Edit/Hapus; custom themes do.
- Full suite green; typecheck clean.

## 9. Out of Scope

- Per-user / private themes (global only).
- Generating/storing `previewImage` (live preview suffices; stays null).
- Import/export, duplicating a theme, theme categories/tags.
- Building new layout packs from the UI (custom themes pick an existing pack `key`).
- Migrations run by the agent (human runs `db:reset`).

## 10. Success Criteria

1. An admin creates a custom theme (name, layout pack, full tokens) with a live preview; it persists and appears in the theme pickers (create modal + editor).
2. The admin edits and deletes custom themes; built-in/curated themes are read-only (no edit/delete; PATCH/DELETE return 403).
3. Deleting a theme that an invitation uses is refused (409).
4. `validateThemeInput` rejects invalid colours/fonts/keys/radius/ornament server-side.
5. Full suite + typecheck green (after `db:reset` for the `builtin` column).

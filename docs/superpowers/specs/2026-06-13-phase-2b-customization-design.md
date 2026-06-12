# Lovree v3 — Design Spec: Phase 2b-customization (Edit Desain: warna & font)

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** Phase 2a (editor) + Phase 2b-media (settings panel, media). Same line of work, branch `feat/phase-2b-media`.
- **Scope:** Let a customer override their invitation's **accent colors and fonts** on top of the theme, with a live preview and a reset-to-theme. Also fixes a latent gap: the curated fonts referenced by design tokens are **never actually loaded**, so the public invitation currently renders with system fallback fonts. Custom generic fields ("field overrides") are a **separate spec** (Phase 2b-fields).

## 1. Background & Goal

The token cascade already exists: `resolveTokens(theme.tokens, invitation.tokenOverrides)` merges a whitelisted set of per-invitation overrides over the theme, and the editor GET already returns the resolved `cssVars`. What's missing:
- **No UI** to author `tokenOverrides` (the column exists, default `{}`, nothing writes it).
- **No endpoint** to persist overrides.
- **Fonts are not loaded.** Tokens name `Cormorant Garamond` / `Poppins`, the renderer sets `font-family: var(--font-heading)`, but no `<link>`/`@font-face` ever loads those families anywhere in the app — so both the public invitation and the editor preview fall back to system fonts.

**Goal:** In the editor settings panel, a customer picks accent colors (primary/secondary/accent) and fonts (heading/body) from a curated set, sees the change live in the preview, and the published invitation renders with those choices and the fonts actually loaded. A reset returns to the theme defaults.

## 2. Decisions carried in from brainstorming

- **Editable knobs:** colors `primary`, `secondary`, `accent`; fonts `heading`, `body`. Background and text colors stay locked to the theme (contrast/readability safety).
- **Fonts are a curated allow-list**, not free text — because the chosen family must actually be loaded. The same list drives validation, the editor dropdowns, and the Google Fonts `<link>`.
- **Font loading (MVP):** a single global Google Fonts `<link>` via `useHead` in `app.vue` loading all curated families. Migrate to `@nuxt/fonts` (self-hosted) later in Phase 4. (The token font names must match the Google Fonts family names exactly.)
- **Live preview:** the editor resolves `cssVars` **client-side** from `resolveTokens(themeTokens, overrides)` (the util is pure and already imported across the server/app boundary elsewhere), so colour/font changes reflect instantly; persistence is a debounced PATCH.

## 3. Token whitelist + curated fonts

### 3.1 Whitelist
`server/theme/tokens.ts` — add `color.accent` to `OVERRIDE_WHITELIST`:
```ts
export const OVERRIDE_WHITELIST = ['color.primary', 'color.secondary', 'color.accent', 'font.heading', 'font.body'] as const
```
`pickWhitelisted` already strips everything else, so background/text/radius/ornament remain theme-locked automatically.

### 3.2 Curated fonts
New `server/theme/fonts.ts`:
```ts
export const HEADING_FONTS = ['Cormorant Garamond', 'Playfair Display', 'Marcellus', 'Great Vibes', 'Cinzel'] as const
export const BODY_FONTS = ['Poppins', 'Lora', 'Nunito Sans', 'EB Garamond'] as const
export const ALL_FONTS = [...new Set([...HEADING_FONTS, ...BODY_FONTS])]

// Builds the Google Fonts CSS2 href that loads every curated family (used by app.vue useHead).
export function googleFontsHref(): string { /* family=Name+With+Plus&family=... + display=swap */ }
```
`googleFontsHref()` URL-encodes each family (spaces → `+`) into a single `https://fonts.googleapis.com/css2?family=...&display=swap` request.

## 4. Validation (pure, testable)

New `server/theme/design-validate.ts`:
```ts
export interface DesignOverrides { color?: { primary?: string; secondary?: string; accent?: string }; font?: { heading?: string; body?: string } }

// Returns a clean, whitelisted overrides object. Throws (or returns an error result)
// when a provided value is invalid: colour must match /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
// font must be in the curated list for its role. Unknown keys are dropped. Empty input
// yields {} (a reset).
export function validateDesignOverrides(raw: unknown): { ok: true; value: DesignOverrides } | { ok: false; error: string }
```
Rules:
- `color.primary|secondary|accent`: if present, must be a valid hex string; else `ok:false`.
- `font.heading`: if present, must be in `HEADING_FONTS`; `font.body`: in `BODY_FONTS`; else `ok:false`.
- Any key not in the whitelist is ignored (not an error).
- Absent keys are simply not set (partial overrides allowed).
- `{}` / non-object → `{ ok: true, value: {} }` (reset to theme).

The endpoint stores `value` directly into `invitations.tokenOverrides`. (`resolveTokens` re-applies `pickWhitelisted` at read time as defense-in-depth.)

## 5. Endpoint

New `PATCH /api/admin/invitations/:id/design`:
- Body `{ tokenOverrides: unknown }`.
- `assertOwnerOr404` (owner check → 404, no existence leak; ownerId from session).
- `validateDesignOverrides(body.tokenOverrides)` → on `ok:false`, throw 400 with the error.
- `db.update(invitations).set({ tokenOverrides: value, updatedAt })`.
- Returns `{ ok: true, tokenOverrides: value }`.

## 6. Editor GET additions

`server/api/admin/invitations/:id/index.get.ts` already returns `cssVars`. Add the raw inputs so the client can live-resolve:
- `themeTokens`: the theme's `tokens` object (already loaded for cssVars).
- `tokenOverrides`: `inv.tokenOverrides` (current saved overrides).

(`cssVars` stays for the initial paint; the client recomputes from `themeTokens` + a reactive overrides ref thereafter.)

## 7. Editor page: live preview + persistence

`app/pages/admin/invitations/[id]/edit.vue`:
- Import `resolveTokens, tokensToCssVars` from `server/theme/tokens` (pure; same cross-boundary import pattern already used for `defaultContent`).
- Hold `const overrides = ref<DesignOverrides>(data.tokenOverrides ?? {})` and `const themeTokens = data.themeTokens`.
- Replace the static `cssVars` const with `const cssVars = computed(() => tokensToCssVars(resolveTokens(themeTokens, overrides.value)))`.
- A debounced `saveDesign()` PATCHes `/design` with `overrides.value` (own debouncer, separate from the document autosave; ~600ms).
- `watch(overrides, …, { deep: true })` → recompute is automatic (computed) + schedule `saveDesign`.
- Pass `:css-vars="cssVars"` to `EditorPreview` (already a prop; now reactive).

## 8. UI: "Desain" subsection in the settings panel

Extend `InvitationSettings.vue` (the "Pengaturan Undangan" panel) with a **Desain** block, OR add a sibling `DesignControls.vue` mounted next to it in the left column. Chosen: a dedicated `app/components/editor/DesignControls.vue` (keeps `InvitationSettings` focused on music; design is its own concern).

`DesignControls.vue`:
- Props: `modelValue: DesignOverrides`, `themeTokens` (to show the effective default in each control's placeholder/swatch).
- Emits `update:modelValue` with the new overrides object on any change.
- Three colour rows (primary/secondary/accent): a native `<input type="color">` + a hex `<input type="text">` kept in sync; clearing a colour removes that key (falls back to theme).
- Two font selects (heading from `HEADING_FONTS`, body from `BODY_FONTS`); a "— ikut tema —" option clears the key.
- A **"Reset ke tema"** button → emits `{}`.
- Indonesian labels: "Warna Utama", "Warna Sekunder", "Warna Aksen", "Font Judul", "Font Teks".

The page wires `v-model` on `DesignControls` to the `overrides` ref.

## 9. Font loading

`app/app.vue` — `useHead({ link: [{ rel: 'preconnect', href: 'https://fonts.googleapis.com' }, { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, { rel: 'stylesheet', href: googleFontsHref() }] })`. This loads all curated families globally, so the public invitation, the editor, and the preview all have them. Fixes the latent "fonts never load" gap as a side effect.

## 10. Testing

- **Pure units:** `validateDesignOverrides` — valid partial override passes; bad hex → `ok:false`; font not in role list → `ok:false`; unknown keys dropped; `{}`/garbage → reset. `googleFontsHref` contains every curated family, plus-encoded, with `display=swap`. `resolveTokens` honours the new `color.accent` whitelist (accent overrides, background still theme-locked).
- **Component:** `DesignControls` lists exactly the curated fonts per role; changing a colour emits the override object; "Reset ke tema" emits `{}`; clearing a font emits an object without that key.
- **Endpoint:** `/design` — owner 404; invalid hex/font → 400; valid override persists; `{}` resets. (Predicate-level via `validateDesignOverrides`; handler thin, matching the codebase's pure-core pattern.)
- **Live preview:** a small check that `tokensToCssVars(resolveTokens(theme, { color: { primary: '#123456' } }))` yields `--color-primary: #123456` while `--color-bg` stays the theme value (guards the reactive-cssVars path).

## 11. Out of Scope

- Custom generic fields / field overrides — **Phase 2b-fields** (separate spec).
- Background & text colour overrides; custom radius/ornament.
- Customer-uploaded fonts; `@nuxt/fonts` self-hosting (Phase 4).
- Per-section style overrides.

## 12. Success Criteria

1. In the editor, changing primary/secondary/accent colour updates the live preview instantly and persists (survives reload).
2. Changing heading/body font (from the curated list) updates the preview and the published invitation, and the chosen font is actually loaded (no system fallback).
3. "Reset ke tema" clears all overrides; the invitation returns to theme defaults.
4. The published `/u/:slug` renders the customer's colours and fonts.
5. A non-owner calling `PATCH /design` gets 404; an invalid colour or non-curated font is rejected with 400; background/text/radius/ornament cannot be overridden even if sent in the body.
6. Fonts referenced by tokens load on every page (latent gap fixed).

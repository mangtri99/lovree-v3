# Lovree v3 — Design Spec: Phase 4 — Additional Themes + Picker

- **Date:** 2026-06-14
- **Status:** Approved for planning
- **Builds on:** All prior phases (token cascade, design-override editor, curated fonts). Same branch `feat/phase-2b-media`.
- **Scope:** Ship a curated set of themes (distinct colour palette + font pairing each), let the customer pick a theme when creating an invitation and switch it in the editor (live preview), and seed the themes idempotently. No theme CRUD UI, no radius/ornament theming (deferred).

## 1. Background & Goal

Only one theme (`Radiant Love`) is seeded; `invitations.themeId` defaults to "the first theme" at create with no UI to choose, and the editor has no theme switcher. The token cascade and renderer already consume all colour + font CSS vars (`--color-primary/secondary/bg/text/accent`, `--font-heading/body`), so palette + font are enough to make themes look distinctly different. `radius`/`ornament` tokens remain unused (out of scope here).

**Goal:** A customer chooses among several themes when creating an invitation and can change the theme later in the editor with an instant preview; the published invitation renders the chosen theme; customer colour/font overrides (Phase 2b-customization) still layer on top.

## 2. Decisions carried in from brainstorming

- **Management:** a fixed curated set, seeded — **no admin CRUD** (themes are a shared/global resource; CRUD is overkill for the single-user model).
- **Distinctiveness:** colour palette (5 colours) + font pairing (2 fonts) per theme only. **No radius/ornament** theming.
- **Theme fonts** are chosen from the existing curated font allow-list (`HEADING_FONTS`/`BODY_FONTS` in `server/theme/fonts.ts`) so they are already loaded globally and render without extra `<link>`s.
- Themes store **partial tokens** (`{ color, font }`); `radius`/`ornament` fall back to `baseTokens` via `resolveTokens`.

## 3. Curated themes (`server/theme/curated-themes.ts`)

```ts
import type { Tokens } from './tokens'
export interface CuratedTheme { name: string; tokens: Pick<Tokens, 'color' | 'font'> }
export const CURATED_THEMES: CuratedTheme[] = [ /* 5 entries */ ]
```
Five themes (each `color: { primary, secondary, bg, text, accent }` + `font: { heading, body }`), fonts from the allow-list:
1. **Radiant Love** — warm brown/cream; Cormorant Garamond + Poppins.
2. **Rose Blush** — soft rose/pink; Playfair Display + Lora.
3. **Emerald Garden** — botanical green/cream; Marcellus + Nunito Sans.
4. **Midnight Gold** — deep navy + gold; Cinzel + EB Garamond.
5. **Dusty Blue** — muted blue/grey; Cormorant Garamond + Nunito Sans.

(Exact hex values chosen at implementation; each must be valid hex and each font must appear in `HEADING_FONTS` (heading) / `BODY_FONTS` (body).)

## 4. Seeding

- `server/db/seed.ts`: replace the single inline theme insert with inserting **all** `CURATED_THEMES`; the demo invitation uses the first (`Radiant Love`). One `npm run db:seed` yields all themes.
- New `server/db/seed-themes.ts` + script `db:seed:themes` (`tsx server/db/seed-themes.ts`): **idempotent** — for each curated theme, insert it only if no theme with that `name` exists. Lets the user add themes to an existing DB without a reset.

## 5. Endpoints

- **`GET /api/admin/themes`** (auth: `session.user?.id` else 401 — themes are global, not owner-scoped): returns `[{ id, name, tokens, previewImage }]`.
- **`PATCH /api/admin/invitations/:id/theme`** (owner-guard → 404): body `{ themeId: uuid }`; verify the theme exists (`SELECT … FROM themes WHERE id = themeId`) else 400; set `invitations.themeId`. Returns `{ ok: true, themeId }`.

## 6. Create-invitation picker

`app/pages/admin/invitations/index.vue` create form: add a theme `USelect` whose items come from `GET /api/admin/themes` (label = theme name, value = id). Default to the first theme. Submit includes `themeId` in the `POST /api/admin/invitations` body (the create endpoint already accepts `themeId`).

## 7. Editor theme switcher

`app/pages/admin/invitations/[id]/edit.vue`:
- Load `GET /api/admin/themes` (the list, with `tokens`).
- Make `themeTokens` **reactive** (a `ref`, seeded from the editor GET's `themeTokens`); keep `cssVars = computed(() => tokensToCssVars(resolveTokens(themeTokens.value, overrides.value)))`.
- Hold `themeId` (from the editor GET) for the current selection.
- A theme `USelect` in the design area: on change → set `themeId`, set `themeTokens.value` to the chosen theme's `tokens`, and `PATCH /api/admin/invitations/:id/theme { themeId }`. The preview recomputes instantly; the override controls continue to layer on top.

The editor GET already returns `themeId` and `themeTokens` (no server change needed there).

## 8. Testing

- **Pure:** a `CURATED_THEMES` validity test — every theme has 5 colours that are valid hex, a heading font in `HEADING_FONTS`, and a body font in `BODY_FONTS`; names are unique.
- **Endpoint:** `PATCH /theme` owner-guard 404 (via `assertOwnerOr404`) and rejects a non-existent themeId (400); `GET /themes` requires auth (401 without session). (Predicate/guard level, matching the thin-shell convention.)
- **Component (light):** the create form renders a theme select populated from the themes list; the editor theme switch updates `themeTokens` and triggers the PATCH (mock `$fetch`).
- Full suite stays green; typecheck clean.

## 9. Out of Scope

- Admin CRUD for themes; per-user/private themes.
- `radius`/`ornament` theming and the decorative divider.
- Theme preview images (`previewImage` stays null for now).
- Changing a theme's effect on already-set customer overrides (overrides always win per the existing cascade — unchanged).

## 10. Success Criteria

1. Several themes exist after seeding; the create form lets the customer pick one, and the new invitation uses it.
2. Switching the theme in the editor instantly updates the preview's colours + fonts and persists (`invitations.themeId`); the published invitation renders the chosen theme.
3. Customer colour/font overrides still apply on top of whatever theme is selected.
4. A non-owner cannot switch another invitation's theme (404); an invalid themeId is rejected (400).

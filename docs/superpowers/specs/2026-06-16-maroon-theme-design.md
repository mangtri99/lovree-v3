# Lovree v3 — Design Spec: "Marun Klasik" Theme (full pack)

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Theme component packs (`themePacks` / `resolveSectionComponent` / `resolveCover`), the `dark_prada` pack (the structural precedent — full 17-section pack + cover), the token cascade, the font allow-list, `GalleryCarousel`. Same branch `feat/phase-2b-media`.
- **Scope:** A new luxury-classic theme "Marun Klasik" — a `CuratedTheme` (cream + maroon + gold palette, Fraunces/Lora fonts) plus a full component pack (`key: 'maroon'`) overriding all 17 section types and its own cover modal. Designed from scratch (no vendored assets); gold ornaments are inline SVG.

## 1. Background & Goal

The user wants a maroon-nuanced theme. Decisions: a **full bespoke pack** (like `dark_prada`), **luxury classic + gold** aesthetic, **light** ground (cream bg, maroon ink, gold accents).

**Goal:** Selecting "Marun Klasik" renders the invitation on a warm cream ground with deep-maroon Fraunces headings, maroon-ink body text, and antique-gold accents/dividers/flourishes — cohesive across all sections + a matching cover.

## 2. Decisions carried in from brainstorming

- **Full pack** overriding all 17 section types + a bespoke cover.
- **Luxury classic + gold**, **light** (cream bg). Palette + fonts fixed below.
- **No vendored assets.** All ornaments (flourish dividers, corner flourishes, card frames) are **inline SVG** drawn with `currentColor`/CSS vars (gold). So the maroon components are asset-free → their unit tests run under plain happy-dom (no `// @vitest-environment nuxt` needed, unlike `dark_prada`).
- **Self-styled, opts out of global ornament tokens:** set `ornament.divider='none'`, `ornament.motif='none'` (the pack draws its own), consistent with `elegant`/`dark_prada`.
- New heading font **Fraunces** added to the allow-list (Google Fonts); body **Lora** already allow-listed. Pairing is unused by other themes (distinct).
- Gallery reuses the shared `GalleryCarousel` (mobile) + a gold-framed grid (desktop), matching the other packs' gallery structure.

## 3. Tokens + fonts

### 3.1 Fonts (`server/theme/fonts.ts`)
- `HEADING_FONTS`: append `'Fraunces'`. (`Lora` already in `BODY_FONTS`.) Name matches the Google Fonts family exactly so `googleFontsHref()` loads it.

### 3.2 Curated theme (`server/theme/curated-themes.ts`)
Append (after the existing entries; `Radiant Love` stays `[0]`):

```ts
  {
    name: 'Marun Klasik',
    key: 'maroon',
    tokens: {
      color: { primary: '#7a1f2b', secondary: '#9c6b6b', bg: '#fbf6ee', text: '#3a2326', accent: '#c0962f' },
      font: { heading: 'Fraunces', body: 'Lora' },
      radius: { sm: '4px', md: '6px', lg: '8px' },
      ornament: { divider: 'none', motif: 'none' },
    },
  },
```

- Palette: primary deep maroon `#7a1f2b`, secondary dusty maroon `#9c6b6b` (rules), bg cream `#fbf6ee`, text maroon-ink `#3a2326`, accent antique gold `#c0962f`.
- Seeding is automatic via `CURATED_THEMES`; **the user must run `db:reset`** (insert-only seeder won't update existing rows, and this is a new row anyway, but a reset is the reliable path on the disposable dev DB).

## 4. Shared visual language (all maroon components)

- Ground: `background: var(--color-bg)` (cream); body text `var(--color-text)` (maroon-ink); headings `font-family: var(--font-heading)` (Fraunces) in `var(--color-primary)` (maroon).
- **Gold flourish divider** — a small inline SVG (centered, tapering lines + center diamond) drawn in `var(--color-accent)`, placed between blocks where the section wants separation. (Reproduce the same SVG in each component that needs it; it's tiny.)
- **Gold hairline rules / card frames** — `1px solid var(--color-accent)` borders with the theme radius (`var(--radius-lg)`).
- **Corner flourishes** — inline SVG quarter-flourishes in gold on the cover + hero corners.
- Buttons/links: filled maroon (`var(--color-primary)`, cream text) or gold outline.

## 5. Component pack (`app/components/invitation/themes/maroon/*.vue` + `themePacks.ts`)

- One component per section type (17): `HeroSection`, `HeroSlideshowSection`, `OpeningSection`, `CoupleSection`, `MemberSection`, `EventSection`, `CountdownSection`, `QuoteSection`, `LoveGiftSection`, `GallerySection`, `VideoSection`, `ClosingSection`, `InfoSection`, `RsvpSection`, `GuestbookSection`, `FooterSection`, `CustomSection`. Plus a cover `CoverModal.vue` (name `MaroonCover`).
- Each copies its base component's `<script setup>` **verbatim** (props/logic — countdown timer, rsvp `useRsvpForm`, guestbook inject, slideshow timer, gallery `renderable`, video computeds), swapping only the `<template>` for the maroon styling. All read CSS vars (token cascade + user overrides keep working).
- Register in `themePacks.ts`: import each as `Maroon<Section>`, add a `maroon: { …17… }` entry to `packs`; add `maroon: MaroonCover` to the `covers` map.
- `GallerySection` (maroon) follows the established split: `md:hidden` → `<GalleryCarousel>`, `hidden md:grid` → gold-framed grid (with optional `title` heading); `data-grid` on the grid container.

## 6. Per-section treatment

**Signature sections:**
- **cover (`MaroonCover`)**: cream ground, gold corner flourishes (inline SVG), eyebrow `title`, `coupleName` in Fraunces maroon (large), "Kepada Yth." + `guestName`, a filled-maroon button (cream text) emitting `open`.
- **hero**: cream, eyebrow gold, `coupleName` Fraunces maroon, date, a gold flourish divider; honours `backgroundImage` (cover photo + light scrim, maroon-tinted) when set.
- **member / couple**: round photo in a thin gold frame, name in maroon Fraunces, parents/childOrder/instagram per the base data.
- **event / love_gift**: cream cards with a `1px solid var(--color-accent)` frame + `var(--radius-lg)`; maroon headings; gold accents on labels.
- **gallery**: shared carousel (mobile) + gold-framed grid (desktop) + optional title.

**Consistent sections** (opening, closing, quote, countdown, rsvp, guestbook, info, footer, custom, video, hero_slideshow): the base layout intent restyled to cream/maroon/gold — Fraunces maroon headings, gold flourish dividers, gold hairlines; rsvp/guestbook forms/bubbles on cream with gold/ maroon accents.

## 7. Testing

- **Fonts (`tests/theme/fonts.test.ts`):** `HEADING_FONTS` includes `'Fraunces'`; `googleFontsHref()` contains `family=Fraunces`.
- **Curated theme (`tests/theme/curated-themes.test.ts`):** existing validity test covers the maroon palette/fonts (Fraunces/Lora must be allow-listed); add an explicit check that `'Marun Klasik'` exists with `key: 'maroon'` and `ornament.divider/motif === 'none'`.
- **Pack resolution (`tests/components/theme-packs.test.ts`, already `// @vitest-environment nuxt`):** `resolveSectionComponent('maroon', type)` returns a non-base, non-null component for every `SECTION_TYPES` entry; `resolveCover('maroon')` returns the maroon cover (not the base).
- **Component (light, `tests/components/maroon.test.ts`):** mount key maroon sections (hero, member, event, footer) + the cover and assert they render their content without crashing; the cover emits `open` on button click. (Asset-free → plain happy-dom.)
- Full suite green; typecheck clean.

## 8. Out of Scope

- Vendored image/SVG asset files (ornaments are inline SVG).
- Dark maroon variant; a second maroon pack.
- `radius`/global `ornament` token rendering changes (already shipped; maroon opts out of the global divider/motif).
- Migrations (jsonb tokens); theme CRUD.

## 9. Success Criteria

1. "Marun Klasik" appears in the picker after `db:reset`; choosing it renders cream + maroon + gold across all sections + a matching cover.
2. The pack overrides all 17 section types and the cover; gold flourishes/frames render via inline SVG (no missing-asset risk).
3. Fraunces + Lora load globally and apply via `--font-heading`/`--font-body`; customer colour/font overrides still layer on top.
4. Full suite + typecheck green.

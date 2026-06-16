# Lovree v3 — Design Spec: "Dark Prada" Theme (component pack)

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Phase 4 themes (curated themes + seeding), theme component packs (`themePacks` / `resolveSectionComponent`), the `elegant` pack (the precedent — overrides every section type), the token cascade (`resolveTokens` → `tokensToCssVars`), the font allow-list (`server/theme/fonts.ts`), `MemberSection` (Peserta). Same branch `feat/phase-2b-media`.
- **Scope:** A new dark, ornament-rich theme "Dark Prada" — a `CuratedTheme` (dark palette + Courgette/DM Sans) plus a full component pack (`key: 'dark_prada'`) overriding all section types, using the source project's own SVG ornaments/dividers/icons + a dark background texture. Cloned from the user's own live page `https://lovree.com/prametatah`.
- **Source of truth:** the user's live page (their own project). Exact tokens + asset URLs were extracted from its compiled CSS (`lovree.com/build/assets/app-5799686e.css`, `.*-darkPrada-*` classes) and `lovree.com/assets/dark-prada/*`.

## 1. Background & Goal

Lovree themes vary by palette + fonts (tokens) and by **component pack** (layout/styling per section). Only `base` and `elegant` packs exist; both are light. The user wants to reproduce their "Dark Prada" invitation — a dark luxury, Balinese-ornament style — as a selectable theme. The section list already supports every block of that page (verified: hero, opening, member/Peserta, closing, event, countdown, gallery, rsvp, guestbook, footer/info), so no new section type is needed — this is purely a new pack + tokens + assets.

**Goal:** A customer picks "Dark Prada" and the invitation renders dark with gold ornaments and the source's visual language, across all section types; customer colour/font overrides still layer on top via the existing cascade.

## 2. Decisions carried in from brainstorming

- **Full coverage:** the pack overrides **all section types** (17): the ~10 present on the reference page are styled faithfully; the rest (`couple`, `quote`, `love_gift`, `custom`, `video`, `hero_slideshow`) get a consistent dark + gold treatment so the theme is cohesive whatever sections the user adds.
- **Assets fetched into `public/`** from the source (the user's own files): SVG ornaments/dividers/icons + the dark background PNG. Components reference them via `<img src>` / CSS `background-image`.
- **Fonts:** add **Courgette** (heading, script) and **DM Sans** (body) to the allow-list (both Google Fonts; the source page uses them).
- **Fidelity:** "close, not pixel-identical" — the source's visual language translated onto Lovree's section data + token cascade. JS-driven AOS animations / Splide carousel are replaced with simple CSS.
- No new section type, no schema/migration change.

## 3. Tokens + fonts

### 3.1 Fonts (`server/theme/fonts.ts`)
- `HEADING_FONTS`: append `'Courgette'`.
- `BODY_FONTS`: append `'DM Sans'`.
- Names match Google Fonts families exactly, so `googleFontsHref()` loads them globally (no per-theme `<link>`). The `font` design-override validation + editor dropdowns pick them up automatically.

### 3.2 Curated theme (`server/theme/curated-themes.ts`)
Append (must stay after `Radiant Love`, which a test pins as `CURATED_THEMES[0]`):

```ts
  {
    name: 'Dark Prada',
    key: 'dark_prada',
    tokens: {
      color: { primary: '#fcc889', secondary: '#3a3a3a', bg: '#1b1a17', text: '#fbfbfb', accent: '#b2d0df' },
      font: { heading: 'Courgette', body: 'DM Sans' },
    },
  },
```

- Mapping from the source's `darkPrada-*` palette: primary (gold) `#FCC889`, bg (dark) `#1B1A17` (their "secondary"), text `#FBFBFB` (light), secondary `#3A3A3A` (their "neutral"), accent `#B2D0DF` (their "accent").
- `radius`/`ornament` tokens fall back to `baseTokens` via `resolveTokens` (unused — ornaments come from SVG assets, not tokens).
- Seeding is automatic: `seed.ts` already inserts all `CURATED_THEMES`; `seed-themes.ts` (idempotent, script `db:seed:themes`) inserts any theme whose `name` is new. **The user must run `db:seed:themes` (or `db:reset`) for the theme to appear** — flagged in the plan, not run by the agent.

## 4. Assets (`public/assets/dark-prada/`)

Fetch (curl) from the source into `public/assets/dark-prada/`, preserving subfolders:
- `ornament/`: `hero-tl.svg`, `hero-tr.svg`, `hero-bl.svg`, `hero-br.svg`, `tl.svg`, `tr.svg`, `ornament-1.svg`, `ornament-5.svg`, `frame.svg`
- `divider/`: `cover.svg`, `flower.svg`, `dark1.svg`, `dark2.svg`
- `icon/`: `date.svg`, `time.svg`, `place.svg`, `map.svg`, `calender-check.svg`, `whatsapp.svg`, `facebook.svg`, `instagram.svg`
- `bg.png` ← from `https://lovree.com/build/assets/bg-2346d62b.png` (dark background texture)

Source bases: `https://lovree.com/assets/dark-prada/{ornament,divider,icon}/<file>`. Components reference assets by absolute path, e.g. `/assets/dark-prada/ornament/hero-tl.svg`. (These are the user's own assets; reuse is authorized.) If any single asset 404s during fetch, note it and proceed — a missing decorative SVG degrades to no-ornament, not a crash.

## 5. Component pack (`app/components/invitation/themes/dark_prada/*.vue` + `themePacks.ts`)

- One component per section type (17): `HeroSection`, `HeroSlideshowSection`, `OpeningSection`, `CoupleSection`, `MemberSection`, `EventSection`, `CountdownSection`, `QuoteSection`, `LoveGiftSection`, `GallerySection`, `VideoSection`, `ClosingSection`, `InfoSection`, `RsvpSection`, `GuestbookSection`, `FooterSection`, `CustomSection`.
- Each takes the same `{ content }` props as its base counterpart (copy the base/elegant prop types verbatim per section) and reads CSS vars (`--color-bg/text/primary/secondary/accent`, `--font-heading/body`) so the token cascade + user overrides keep working.
- Register in `themePacks.ts`: import each as `DarkPrada<Section>` and add a `dark_prada: { … 17 entries … }` pack alongside `elegant`. `resolveSectionComponent('dark_prada', type)` then returns the pack component; unknown types still fall back to `base` (but all 17 are provided).

## 6. Shared visual language (all dark_prada components)

- Dark surface: `background: var(--color-bg)` layered over the texture `url(/assets/dark-prada/bg.png)`; light body text `var(--color-text)`; headings in `var(--font-heading)` (Courgette) coloured gold `var(--color-primary)`.
- Section separation: a centered flower divider (`/assets/dark-prada/divider/flower.svg`) where the source uses one.
- Gold accents: thin gold rules/borders (`var(--color-primary)`), circular photo frames.

## 7. Per-section treatment

**Faithful (present on the reference):**
- **hero:** dark panel with four corner ornaments (`hero-tl/tr/bl/br.svg`), title in Courgette, date + guest greeting; optional `backgroundImage`/scrim still honoured (hero schema already supports it).
- **opening:** centered greeting + body, flower divider.
- **member (Peserta):** each participant photo in a circular `frame.svg`, name in gold, the group `parents` line ("Putri Dari: …") and `childOrder`, participants stacked — mirrors the honorees block.
- **event:** rows with icon SVGs (`date/time/place`) + text, a maps button using `map.svg` linking `mapsUrl`.
- **countdown:** Hari/Jam/Menit/Detik blocks on dark with gold numerals.
- **gallery:** responsive photo grid with gold-bordered frames (CSS, no Splide).
- **rsvp:** dark form (Nama, Ucapan) + attendance radios styled to the palette.
- **guestbook:** comment bubbles (`--color-secondary` surfaces) listing entries.
- **closing:** centered blessing text + divider.
- **footer + info:** copyright/branding line; social icons (`whatsapp/facebook/instagram.svg`); `info` renders phone + social links with the same icons.

**Consistent dark treatment (not on the reference, styled for cohesion):**
- **couple, quote, love_gift, custom, video, hero_slideshow:** same data/layout intent as base, restyled to the dark palette + Courgette gold headings + flower divider. No bespoke ornaments required.

## 8. Testing

- **Curated theme (`tests/theme/curated-themes.test.ts`):** the existing validity test already iterates all themes — it will assert Dark Prada's 5 hex colours are valid and that `Courgette`/`DM Sans` are allow-listed (so the fonts.ts change is required for it to pass). Add an explicit check that a theme named `'Dark Prada'` exists with `key: 'dark_prada'`.
- **Fonts (`tests/theme/fonts.test.ts` if present, else add):** `HEADING_FONTS` includes `'Courgette'`, `BODY_FONTS` includes `'DM Sans'`, and `googleFontsHref()` contains `family=Courgette` and `family=DM+Sans`.
- **Pack resolution (`tests/components/theme-packs.test.ts`):** `resolveSectionComponent('dark_prada', type)` returns a (non-base, non-null) component for **every** `SECTION_TYPES` entry — i.e. the pack overrides all 17, same invariant the test enforces for `elegant`.
- **Component (light, base+elegant pattern):** mount a few key dark_prada sections (hero, member, event, footer) and assert they render their content without crashing on empty/edge content.
- Full suite green; typecheck clean.

## 9. Out of Scope

- Pixel-perfect parity; AOS scroll animations; Splide/Fancybox JS carousels/lightbox (simple CSS instead).
- Theme preview image (`previewImage` stays null).
- `radius`/`ornament` token theming (ornaments are SVG assets, not tokens).
- Re-encoding/optimising the fetched assets; new section types; schema/migration changes.

## 10. Success Criteria

1. "Dark Prada" appears as a selectable theme after seeding; choosing it renders the invitation dark with gold ornaments.
2. The pack overrides all 17 section types; the ~10 reference sections are styled faithfully (corner ornaments, circular frames, icon rows, flower dividers), the rest cohesively dark.
3. Courgette + DM Sans load globally and apply via `--font-heading`/`--font-body`; customer colour/font overrides still layer on top.
4. Assets resolve from `public/assets/dark-prada/`; missing decorative assets degrade gracefully.
5. Full suite + typecheck green.

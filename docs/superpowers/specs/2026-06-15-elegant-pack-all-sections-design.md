# Lovree v3 — Design Spec: Elegant Theme Pack — All Sections

- **Date:** 2026-06-15
- **Status:** Approved for planning
- **Builds on:** Theme component packs iteration 1 (resolver + elegant Hero/Couple). Same branch `feat/phase-2b-media`.
- **Scope:** Complete the `elegant` theme pack so it overrides **every** section type with a cohesive elegant restyle (currently only `hero` + `couple`). Extract the RSVP form logic into a composable so the elegant RSVP reuses it without duplicating the submit path. No schema/data changes, no new themes.

## 1. Background & Goal

The `elegant` pack overrides `hero` + `couple`; all other sections fall back to `base`, so an "Elegant Noir" invitation looks elegant at the top and plain below. 

**Goal:** Every section renders a cohesive elegant variant when the theme is `elegant`, while keeping identical content props and behavior (RSVP still submits, guestbook still live). Adding the variants follows the established pack pattern (`themes/elegant/<Section>.vue` + register in `themePacks.ts`).

## 2. Decisions carried in from brainstorming

- **Cohesive restyle** (not wildly distinct per-section layouts): one elegant design language across all sections — serif **italic** headings, a thin ornamental divider under headings, eyebrow text with wide tracking, generous vertical padding, thin `--color-secondary` card borders, `--color-accent` highlights. Same structure as base, elegant look.
- Variants keep the **same `content` props and behavior** as their base counterparts; they only differ in markup/style. They read the same `--color-*`/`--font-*` CSS vars (palette still cascades).
- **RSVP logic is extracted** into `useRsvpForm()` so the base RSVP and the elegant RSVP share one submit path (no fragile duplication). Guestbook is just an inject + render — duplicated trivially in the elegant variant.

## 3. Elegant components (`app/components/invitation/themes/elegant/`)

Create an elegant variant for each remaining section, same `content` prop shape as the base (see base components for shapes):
`OpeningSection`, `EventSection`, `CountdownSection`, `QuoteSection`, `LoveGiftSection`, `GallerySection`, `VideoSection`, `ClosingSection`, `InfoSection`, `RsvpSection`, `GuestbookSection`, `FooterSection`, `CustomSection`.

Design-language notes per kind:
- **Text sections** (opening, closing, quote, custom): centered, serif-italic heading + thin divider; body in a comfortable max-width column.
- **Event / love_gift / info**: cards with a thin `--color-secondary` border, italic titles, accent links/buttons.
- **Countdown**: same logic (the hydration-safe clock from base), elegant number styling (large serif, label small-caps).
- **Gallery**: same image grid, a touch more spacing / subtle frame.
- **Video**: same `YouTubeEmbed` list, elegant spacing.
- **Footer**: elegant band (still uses `--color-primary` background).
- **RSVP**: elegant form (same inputs), uses `useRsvpForm()`.
- **Guestbook**: elegant entry cards, same injected `guestbook`.

`CountdownSection` keeps the base's `onMounted` clock to avoid an SSR hydration mismatch (start at 0, real clock on mount). `VideoSection`/`GallerySection`/`CustomSection` keep the base's `renderable`/filter logic.

## 4. RSVP form composable (`app/composables/useRsvpForm.ts`)

Extract the base RSVP submit logic:
```ts
export function useRsvpForm() {
  // inject guestbook (reactive), guestName, slug, guestCode
  // refs: name (prefilled from guestName), attendance ('yes'|'no'|'maybe'), message, submitting, done, error
  // submit(): POST /api/invitations/:slug/rsvp; on success, unshift a messaged entry into guestbook; set done
  return { name, attendance, message, submitting, done, error, submit }
}
```
- **`base` `RsvpSection.vue`** is refactored to consume `useRsvpForm()` (markup unchanged) — proving the extraction and keeping one source of truth.
- **`elegant` `RsvpSection.vue`** consumes `useRsvpForm()` with elegant markup.

## 5. Registration

In `app/components/invitation/themePacks.ts`, the `elegant` pack maps **all** section types to their elegant component (hero/couple already mapped + the 13 new). Section types not built (there are none left) would still fall back to `base` via the resolver — but the pack is now complete for all 15 types.

## 6. Testing

- **Composable:** `useRsvpForm` — submitting posts to `/api/invitations/:slug/rsvp` with the form values + guest code, prepends a messaged entry to the injected guestbook, and sets `done` (mock `$fetch`; provide `guestbook`/`guestName`/`slug`/`guestCode`). The existing base `RsvpSection` component test continues to pass after the refactor (submit + prepend).
- **Components:** a render test per elegant section (renders its content — e.g. event name, love-gift bank, quote text, custom row, guestbook entry, footer text, info phone). Elegant RSVP submits + prepends (reuses the composable). Group into a couple of test files.
- **Resolver:** `resolveSectionComponent('elegant', t)` returns the elegant component (not the base) for every section type now overridden (spot-check a few: footer, event, rsvp); unknown type still `null`.
- Full suite green; typecheck clean.

## 7. Out of Scope

- Per-section dramatically distinct layouts (cohesive restyle only).
- Additional theme packs / new themes; theme CRUD.
- Schema/content changes; cover/music styling per theme.

## 8. Success Criteria

1. With theme "Elegant Noir", **every** section renders the cohesive elegant style (not just hero/couple); base themes are unchanged.
2. The elegant RSVP submits and updates the live guestbook; the base RSVP still works (shared `useRsvpForm`).
3. The same invitation content renders fully elegant under `elegant` and fully base under `base`.
4. The `elegant` pack maps all 15 section types.

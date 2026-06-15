# Lovree v3 — Design Spec: Package A — Date picker / format + Closing greeting

- **Date:** 2026-06-15
- **Status:** Approved for planning
- **Builds on:** Section registry, theme component packs (base + elegant). Same branch `feat/phase-2b-media`.
- **Scope:** Date fields become **date-only**; Hero and Event gain a **date-format** dropdown (preset, default `DD MMMM YYYY`) applied at render; Countdown counts to midnight of its date; Closing gains a **greeting** field rendered like Opening. (Package A of the UPDATE.md basket; B–E are separate specs.)

## 1. Background & Goal

`DateControl` uses `type="datetime-local"`, so every date field shows a time component; dates render raw (`{{ content.date }}`). Closing has only a body. 

**Goal:** Dates are picked as a plain date and displayed in a customer-chosen Indonesian preset format; the countdown targets midnight of its date; the closing section reads like the opening (greeting + body). Affects both the `base` and `elegant` theme packs.

## 2. Decisions carried in from brainstorming

- **Date-only:** change `DateControl` to `<input type="date">` — all `type:'date'` fields (hero.date, event.date, countdown.targetDate) become date-only, stored as `YYYY-MM-DD`.
- **Format = preset dropdown** (not free token). Presets (id-ID): `DD MMMM YYYY` (default), `dddd, DD MMMM YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY`. Hero + Event each carry their own `dateFormat`.
- **Countdown → midnight:** `new Date('YYYY-MM-DD')` parses as UTC midnight; countdown logic unchanged. No format field for countdown (it's a counter).
- **Closing greeting:** add a `greeting` field; render a heading above the body, mirroring Opening.
- No migration (JSONB; new fields default via `validateContent`).

## 3. Date utilities (`app/utils/date-format.ts`)

```ts
export const DATE_FORMATS: { id: string; example: string }[] = [
  { id: 'DD MMMM YYYY', example: '01 September 2026' },
  { id: 'dddd, DD MMMM YYYY', example: 'Senin, 01 September 2026' },
  { id: 'DD/MM/YYYY', example: '01/09/2026' },
  { id: 'DD-MM-YYYY', example: '01-09-2026' },
]

// Formats an ISO date (date or datetime) to the chosen preset, id-ID, UTC-anchored
// to avoid timezone off-by-one. A non-date string is returned unchanged (so legacy
// freeform values aren't mangled); empty → ''.
export function formatDate(iso: string, format = 'DD MMMM YYYY'): string { /* … */ }
```
Implementation: regex-extract `YYYY-MM-DD` from the start of `iso`; build `new Date(Date.UTC(y, m-1, d))`; use `Intl.DateTimeFormat('id-ID', { month:'long'|weekday:'long', timeZone:'UTC' })` for the month/weekday names; assemble per preset with zero-padded day/month. Unknown format → default `DD MMMM YYYY`.

## 4. New editor control (`DateFormatControl`)

`app/components/editor/controls/DateFormatControl.vue`: a `USelect` of `DATE_FORMATS` (label = `"<id> — <example>"`, value = `id`), defaulting the displayed value to `'DD MMMM YYYY'` when empty. New field type `'dateformat'`:
- Add `'dateformat'` to the `FieldType` union (`server/registry/sections.ts`).
- Map `dateformat: DateFormatControl` in `FieldEditor.vue`'s control map.

`DateControl.vue`: change the input to `type="date"` (date-only). No other change.

## 5. Registry schema + descriptors (`server/registry/sections.ts`)

- `heroSchema`: add `dateFormat: z.string().default('DD MMMM YYYY')`.
- `eventItemSchema`: add `dateFormat: z.string().default('DD MMMM YYYY')`.
- `closingSchema`: add `greeting: z.string().default('')` (becomes `{ greeting, body }`).
- Hero `fields`: add `dateFormat: { type: 'dateformat', label: 'Format Tanggal' }`.
- Event item `fields`: add `dateFormat: { type: 'dateformat', label: 'Format Tanggal' }`.
- Closing `fields`: add `greeting: { type: 'text', label: 'Salam' }` (before `body`).

## 6. Render (base + elegant packs)

- **HeroSection** (`sections/HeroSection.vue` + `themes/elegant/HeroSection.vue`): the date line renders `formatDate(content.date, content.dateFormat)` (import `formatDate`). Props type gains `dateFormat: string`.
- **EventSection** (base + elegant): the event date renders `formatDate(e.date, e.dateFormat)`. Event item type gains `dateFormat: string`.
- **ClosingSection** (base + elegant): props become `{ greeting: string; body: string }`; render a heading for `greeting` (when non-empty, `--font-heading`, elegant uses italic) above the body.
- **CountdownSection**: no change (date-only input already yields a midnight target).

## 7. Seed

`server/db/seed.ts`: change the demo countdown `targetDate` to a date-only value (e.g. `'2026-09-01'`).

## 8. Testing

- **Pure:** `formatDate` — each preset (`'01 September 2026'`, `'Senin, 01 September 2026'`, `'01/09/2026'`, `'01-09-2026'`); accepts a datetime input (`'2026-09-01T08:00'` → date part); empty → `''`; non-date (`'besok'`) → unchanged; unknown format → default. `DATE_FORMATS` has ≥3 presets, default id present.
- **Component:** Hero (base + elegant) renders the formatted date for a given `date`+`dateFormat`; Event (base + elegant) formats the event date; Closing (base + elegant) renders the greeting + body; `DateFormatControl` lists the presets; `FieldEditor` maps `'dateformat'` → `DateFormatControl`; `DateControl` input is `type="date"`.
- **Registry:** `validateContent('closing', { greeting:'Om Swastiastu', body:'x' })` keeps both; `validateContent('hero', {})` defaults `dateFormat` to `'DD MMMM YYYY'`; same for event item.
- Full suite green; typecheck clean.

## 9. Out of Scope

- Hero background photo / Hero Slideshow (Package B); footer rich text (C); SEO (D); Invitation Word + create modal (E).
- Per-locale beyond id-ID; time-of-day in countdown.

## 10. Success Criteria

1. Hero/Event/Countdown date pickers are date-only.
2. Hero and Event display the date in the selected preset format (default `DD MMMM YYYY`), in both base and elegant themes.
3. Countdown counts down to midnight of its date.
4. Closing has a greeting field shown as a heading above the body, like Opening, in both themes.

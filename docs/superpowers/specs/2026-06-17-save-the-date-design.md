# Lovree v3 — Design Spec: "Simpan Tanggal" → Google Calendar (countdown)

- **Date:** 2026-06-17
- **Status:** Approved for planning
- **Builds on:** `CountdownSection` (base + elegant + dark_prada + maroon), the section registry (`countdownSchema`), public invitation render. Same branch `feat/phase-2b-media`.
- **Scope:** Add a "Simpan Tanggal" (Save the Date) button to the countdown section that opens Google Calendar pre-filled with the event, so a guest can save it to their own calendar. No OAuth — a Google Calendar template URL.

## 1. Background & Goal

The countdown ("Menuju Hari Bahagia") only counts down; guests have no quick way to put the date in their calendar. Guests are not authenticated in our app, so an OAuth/Calendar-API auto-insert is impractical. The standard no-auth pattern is a **Google Calendar template URL** (`calendar.google.com/calendar/render?action=TEMPLATE&…`) that opens Calendar with a pre-filled event the user confirms with one tap.

**Goal:** A "📅 Simpan Tanggal" button in the countdown opens Google Calendar pre-filled (title, all-day date, optional location) in a new tab; works across all four countdown themes.

## 2. Decisions carried in from brainstorming

- **Google Calendar template URL**, no OAuth/API. The user taps "Save" in Google Calendar (we cannot silently insert without auth — out of scope).
- **Event data from new countdown fields:** `title` + `location` (self-contained; no cross-section inject). Empty `title` → fallback `"Simpan Tanggal"`.
- **All-day event** (the countdown `targetDate` is date-only): `dates=YYYYMMDD/YYYYMMDD+1` (Google's end date is exclusive, so +1 day).
- **Shared, theme-neutral button** (`SaveDateButton.vue`) reading CSS vars, dropped into all four countdown variants.
- **Google Calendar only** for now (no `.ics`/Apple/Outlook, no timed events).

## 3. Registry (`server/registry/sections.ts`)

- `countdownSchema` becomes:

```ts
const countdownSchema = z.object({
  targetDate: z.string().default(''),
  title: z.string().default(''),
  location: z.string().default(''),
})
```

- Countdown `fields`: add `title` and `location` (after `targetDate`):

```ts
    fields: {
      targetDate: { type: 'date' as const, label: 'Tanggal Acara' },
      title: { type: 'text' as const, label: 'Judul Acara' },
      location: { type: 'text' as const, label: 'Lokasi' },
    },
```

(Keep the existing `targetDate` field exactly as it is; add the two new lines. If the countdown entry currently has no `fields`, add the whole `fields` block.)

- **Test impact:** `validateContent('countdown', {})` now returns `{ targetDate: '', title: '', location: '' }` — update the existing countdown default assertion in `tests/registry/sections.test.ts` (the `{ targetDate: '' }` one).

## 4. Pure util `googleCalendarUrl` (`app/utils/calendar.ts`, new)

```ts
export function googleCalendarUrl(input: { title: string; date: string; location?: string; details?: string }): string
```

- Parse `date` as a date-only ISO (`YYYY-MM-DD`); if it doesn't match, return `''` (the button hides).
- Build an **all-day** range: `start = YYYYMMDD` (the date), `end = YYYYMMDD` of the **next day** (Google treats the end as exclusive).
- Title: `input.title.trim() || 'Simpan Tanggal'`.
- URL: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<enc title>&dates=<start>/<end>&details=<enc details>&location=<enc location>` — `encodeURIComponent` every value; omit `details`/`location` params when empty.
- Pure, dependency-free (compute next-day from the parsed Y/M/D using `Date.UTC` to avoid TZ drift), so it's unit-testable and SSR-safe.

## 5. `SaveDateButton.vue` (new, `app/components/invitation/`)

- Props: `{ title: string; date: string; location?: string }`.
- `const url = computed(() => googleCalendarUrl({ title: props.title, date: props.date, location: props.location }))`.
- Renders, only when `url` is non-empty, an anchor:
  `<a :href="url" target="_blank" rel="noopener noreferrer" …>📅 Simpan Tanggal</a>`
- Styling reads theme CSS vars (e.g. a pill with `border: 1px solid var(--color-primary)` / text `var(--color-primary)`, or filled `var(--color-primary)` with `var(--color-bg)` text) so it adapts to every theme. Theme-neutral; no per-theme variant.
- When `url === ''` (no/invalid date) renders nothing.

## 6. Countdown variants (base + elegant + dark_prada + maroon)

Each `CountdownSection.vue` props type extends to `{ targetDate: string; title?: string; location?: string }` and, below the unit row, renders:

```vue
<SaveDateButton :title="content.title ?? ''" :date="content.targetDate" :location="content.location ?? ''" />
```

(Import `SaveDateButton` with the correct relative path: `./SaveDateButton.vue` won't apply — base is in `sections/` so `../SaveDateButton.vue`; the three packs are in `themes/<key>/` so `../../SaveDateButton.vue`.) The timer/units logic stays unchanged.

## 7. Testing

- **`googleCalendarUrl` (`tests/utils/calendar.test.ts`):**
  - `{ title: 'Pernikahan A & B', date: '2026-09-01', location: 'Bali' }` → URL contains `action=TEMPLATE`, `text=Pernikahan%20A%20%26%20B`, `dates=20260901/20260902` (all-day, end = next day), `location=Bali`.
  - Empty title → `text=Simpan%20Tanggal`.
  - Invalid/empty date (`''`, `'oops'`) → returns `''`.
  - Omits `location`/`details` params when empty.
- **`SaveDateButton.vue` (`tests/components/save-date-button.test.ts`):** with a valid `date` renders an `<a>` whose `href` starts with `https://calendar.google.com/calendar/render`; with an empty `date` renders no anchor.
- **Countdown variants:** each of the four renders a `SaveDateButton` when given a `targetDate` (mount with `content: { targetDate: '2030-01-01', title: 'X', location: 'Y' }` and assert `findComponent({ name: 'SaveDateButton' }).exists()`).
- **Registry:** update `validateContent('countdown', {})` → `{ targetDate: '', title: '', location: '' }`.
- Pure/happy-dom tests (the maroon/dark_prada countdown variants are asset-free; the existing dark-prada/maroon test files already group countdown — add the SaveDateButton assertion there or in a small dedicated test).
- Full suite green; typecheck clean.

## 8. Out of Scope

- OAuth / Google Calendar API silent insert; per-guest calendar auth.
- `.ics` download (Apple/Outlook), Yahoo/Outlook web links.
- Timed events (all-day only); recurring events; reminders.
- Adding the button to any section other than countdown.

## 9. Success Criteria

1. The countdown shows a "Simpan Tanggal" button (when a date is set) that opens Google Calendar pre-filled with the event title, the all-day date, and the location.
2. The event data comes from the countdown's own `title`/`location` fields; empty title falls back to "Simpan Tanggal".
3. The button appears in all four countdown themes and adapts to each theme's colours; it hides when there's no valid date.
4. Full suite + typecheck green.

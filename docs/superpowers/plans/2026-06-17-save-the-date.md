# "Simpan Tanggal" → Google Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Simpan Tanggal" button to the countdown section that opens Google Calendar pre-filled (all-day event with title + location), across all four countdown themes.

**Architecture:** A pure `googleCalendarUrl` util builds a Google Calendar template URL from the countdown's new `title`/`location` fields + `targetDate` (all-day, end-exclusive +1 day). A shared theme-neutral `SaveDateButton.vue` renders the link (hidden when the date is invalid) and is dropped into all four `CountdownSection` variants.

**Tech Stack:** Nuxt 4, Vue 3, Zod registry, Tailwind, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-17-save-the-date-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Note:** untracked `gallery.png` is the user's reference asset — leave it, never stage it.

---

## File Structure

- `server/registry/sections.ts` (modify) — `countdownSchema` + countdown `fields` gain `title`, `location`.
- `app/utils/calendar.ts` (create) — pure `googleCalendarUrl`.
- `app/components/invitation/SaveDateButton.vue` (create) — shared button.
- `app/components/invitation/sections/CountdownSection.vue` + the 3 theme variants (modify) — render the button.
- Tests: `tests/registry/sections.test.ts` (modify), `tests/utils/calendar.test.ts` (create), `tests/components/save-date-button.test.ts` (create), `tests/components/save-date-countdown.test.ts` (create).

---

### Task 1: Countdown title + location fields

**Files:**
- Modify: `server/registry/sections.ts`
- Test: `tests/registry/sections.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/registry/sections.test.ts`, add (near the existing countdown test in the `section registry` describe):

```ts
  it('countdown defaults title + location and exposes them as text fields', () => {
    expect(validateContent('countdown', {})).toEqual({ targetDate: '', title: '', location: '' })
    expect((sectionRegistry as any).countdown.fields.title.type).toBe('text')
    expect((sectionRegistry as any).countdown.fields.location.type).toBe('text')
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: FAIL — countdown defaults are `{ targetDate: '' }`, no title/location.

- [ ] **Step 3: Implement**

In `server/registry/sections.ts`, change `countdownSchema`:

```ts
const countdownSchema = z.object({ targetDate: z.string().default(''), title: z.string().default(''), location: z.string().default('') })
```

In the `countdown` registry entry's `fields` (currently only `targetDate`), add the two fields:

```ts
    fields: {
      targetDate: { type: 'date' as const, label: 'Tanggal Tujuan' },
      title: { type: 'text' as const, label: 'Judul Acara' },
      location: { type: 'text' as const, label: 'Lokasi' },
    },
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: countdown gains title + location fields"
```

---

### Task 2: `googleCalendarUrl` util

**Files:**
- Create: `app/utils/calendar.ts`
- Test: `tests/utils/calendar.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/calendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { googleCalendarUrl } from '../../app/utils/calendar'

describe('googleCalendarUrl', () => {
  it('builds an all-day template url with end = next day', () => {
    const u = googleCalendarUrl({ title: 'Pernikahan A & B', date: '2026-09-01', location: 'Bali' })
    expect(u).toContain('https://calendar.google.com/calendar/render?')
    expect(u).toContain('action=TEMPLATE')
    expect(u).toContain('text=Pernikahan%20A%20%26%20B')
    expect(u).toContain('dates=20260901/20260902')
    expect(u).toContain('location=Bali')
  })
  it('falls back to "Simpan Tanggal" for an empty title', () => {
    expect(googleCalendarUrl({ title: '', date: '2026-09-01' })).toContain('text=Simpan%20Tanggal')
  })
  it('omits location/details params when empty', () => {
    const u = googleCalendarUrl({ title: 'X', date: '2026-09-01' })
    expect(u).not.toContain('location=')
    expect(u).not.toContain('details=')
  })
  it('handles month/year wrap for the end date', () => {
    expect(googleCalendarUrl({ title: 'X', date: '2026-12-31' })).toContain('dates=20261231/20270101')
  })
  it('returns empty string for an invalid/empty date', () => {
    expect(googleCalendarUrl({ title: 'X', date: '' })).toBe('')
    expect(googleCalendarUrl({ title: 'X', date: 'oops' })).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/utils/calendar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/utils/calendar.ts`:

```ts
// Build a Google Calendar "template" URL (no auth) for an all-day event.
// Date-only ISO input; Google's end date is exclusive, so the end is the next day.
export function googleCalendarUrl(input: { title: string; date: string; location?: string; details?: string }): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((input.date ?? '').trim())
  if (!m) return ''
  const [, y, mo, d] = m
  const start = `${y}${mo}${d}`
  const end = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d) + 1))
  const endStr = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`
  const text = (input.title ?? '').trim() || 'Simpan Tanggal'
  const params = ['action=TEMPLATE', `text=${encodeURIComponent(text)}`, `dates=${start}/${endStr}`]
  if (input.details?.trim()) params.push(`details=${encodeURIComponent(input.details)}`)
  if (input.location?.trim()) params.push(`location=${encodeURIComponent(input.location)}`)
  return `https://calendar.google.com/calendar/render?${params.join('&')}`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/utils/calendar.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add app/utils/calendar.ts tests/utils/calendar.test.ts
git commit -m "feat: googleCalendarUrl (all-day template url)"
```

---

### Task 3: `SaveDateButton` component

**Files:**
- Create: `app/components/invitation/SaveDateButton.vue`
- Test: `tests/components/save-date-button.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/save-date-button.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaveDateButton from '../../app/components/invitation/SaveDateButton.vue'

describe('SaveDateButton', () => {
  it('renders a Google Calendar link when the date is valid', () => {
    const w = mount(SaveDateButton, { props: { title: 'Resepsi', date: '2026-09-01', location: 'Bali' } })
    const a = w.find('a')
    expect(a.exists()).toBe(true)
    expect(a.attributes('href')).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render/)
    expect(a.attributes('target')).toBe('_blank')
  })
  it('renders nothing when there is no valid date', () => {
    const w = mount(SaveDateButton, { props: { title: 'Resepsi', date: '' } })
    expect(w.find('a').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/save-date-button.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/components/invitation/SaveDateButton.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { googleCalendarUrl } from '~/utils/calendar'

defineOptions({ name: 'SaveDateButton' })
const props = defineProps<{ title: string; date: string; location?: string }>()
const url = computed(() => googleCalendarUrl({ title: props.title, date: props.date, location: props.location }))
</script>
<template>
  <a
    v-if="url" :href="url" target="_blank" rel="noopener noreferrer"
    class="mt-6 inline-block px-6 py-2 text-sm"
    style="border: 1px solid var(--color-primary); color: var(--color-primary); border-radius: var(--radius-md)"
  >📅 Simpan Tanggal</a>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/save-date-button.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/SaveDateButton.vue tests/components/save-date-button.test.ts
git commit -m "feat: SaveDateButton (themed Google Calendar link)"
```

---

### Task 4: Wire the button into all four countdown variants

**Files:**
- Modify: `app/components/invitation/sections/CountdownSection.vue` (base), `app/components/invitation/themes/elegant/CountdownSection.vue`, `app/components/invitation/themes/dark_prada/CountdownSection.vue`, `app/components/invitation/themes/maroon/CountdownSection.vue`
- Test: `tests/components/save-date-countdown.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/save-date-countdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/CountdownSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/CountdownSection.vue'
import DarkPrada from '../../app/components/invitation/themes/dark_prada/CountdownSection.vue'
import Maroon from '../../app/components/invitation/themes/maroon/CountdownSection.vue'

const content = { targetDate: '2030-01-01', title: 'Resepsi', location: 'Bali' }

for (const [name, Comp] of [['base', Base], ['elegant', Elegant], ['dark_prada', DarkPrada], ['maroon', Maroon]] as const) {
  describe(`CountdownSection (${name})`, () => {
    it('renders a SaveDateButton', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.findComponent({ name: 'SaveDateButton' }).exists()).toBe(true)
    })
  })
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/save-date-countdown.test.ts`
Expected: FAIL — no `SaveDateButton` in the variants.

- [ ] **Step 3: Base `CountdownSection.vue`**

In `app/components/invitation/sections/CountdownSection.vue`:
- Add the import in `<script setup>` (after the vue import): `import SaveDateButton from '../SaveDateButton.vue'`.
- Widen the props type to `defineProps<{ content: { targetDate: string; title?: string; location?: string } }>()`.
- In the template, after the units flex `</div>` and before the closing `</section>`, add:

```vue
    <SaveDateButton :title="content.title ?? ''" :date="content.targetDate" :location="content.location ?? ''" />
```

- [ ] **Step 4: Elegant `CountdownSection.vue`**

Same three changes, but the import path is `import SaveDateButton from '../../SaveDateButton.vue'`. Widen the props type the same way, and add the `<SaveDateButton … />` line just before the closing `</section>` (after the units block).

- [ ] **Step 5: Dark Prada `CountdownSection.vue`**

Same as elegant: import `from '../../SaveDateButton.vue'`, widen props, add the `<SaveDateButton … />` line before `</section>`.

- [ ] **Step 6: Maroon `CountdownSection.vue`**

Same as elegant: import `from '../../SaveDateButton.vue'`, widen props, add the `<SaveDateButton … />` line before `</section>`.

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/components/save-date-countdown.test.ts`
Expected: PASS (4).

- [ ] **Step 8: Commit**

```bash
git add app/components/invitation/sections/CountdownSection.vue app/components/invitation/themes/elegant/CountdownSection.vue app/components/invitation/themes/dark_prada/CountdownSection.vue app/components/invitation/themes/maroon/CountdownSection.vue tests/components/save-date-countdown.test.ts
git commit -m "feat: Simpan Tanggal button in all countdown themes"
```

---

### Task 5: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + calendar 5 + save-date-button 2 + save-date-countdown 4 + registry update).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: the countdown shows a themed "Simpan Tanggal" button (when a date is set) opening Google Calendar pre-filled with the title/all-day date/location; works in all four themes; hides without a valid date. No DB change (jsonb; new countdown fields default to ''). Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 registry → Task 1; §4 util → Task 2; §5 button → Task 3; §6 variant wiring → Task 4; §7 testing → Tasks 1–4 + Task 5 gate. All covered.
- **Type consistency:** `googleCalendarUrl({ title, date, location?, details? })` (Task 2) consumed by `SaveDateButton` (Task 3) and the variants pass `content.title/targetDate/location` (Task 4); countdown content type `{ targetDate; title?; location? }` consistent across the four variants and the registry schema (Task 1).
- **All-day correctness:** end date computed via `Date.UTC(..., d+1)` so month/year wrap is handled (tested 2026-12-31 → 20270101); Google's exclusive end means the event shows on the single target day.
- **Import paths:** base imports `../SaveDateButton.vue`; the three packs import `../../SaveDateButton.vue`; `SaveDateButton` imports the util via `~/utils/calendar` (same `~` alias other section components use for `~/utils/date-format`).
- **No nuxt env / assets:** util + button + countdown variants are asset-free; tests run under plain happy-dom.
- **No DB change:** jsonb document; new countdown fields default to `''` via `validateContent`.

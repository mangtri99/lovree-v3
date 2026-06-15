# Package A — Date picker/format + Closing greeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Date fields become date-only; Hero/Event display dates in a chosen preset format; Countdown targets midnight; Closing gains a greeting — across base and elegant packs.

**Architecture:** A pure `formatDate(iso, preset)` + `DATE_FORMATS` drive display; a `DateFormatControl` (new `dateformat` field type) edits the preset; `DateControl` becomes date-only. Registry schemas gain `dateFormat` (hero/event) and `greeting` (closing); the base and elegant render components apply them.

**Tech Stack:** Nuxt 4, Vue 3, Zod, Vitest + @vue/test-utils. No new deps, no migration.

**Branch:** `feat/phase-2b-media`.

**Grounding facts:**
- `DateControl.vue` uses `<UInput type="datetime-local">`. Used by every `type:'date'` field (hero.date, event.date, countdown.targetDate).
- `FieldEditor.vue` control map: `{ text, longtext, date, url, youtube, image, list, gallery }` → control, fallback `TextControl`. `FieldType` union in `server/registry/sections.ts`: `'text'|'longtext'|'date'|'url'|'youtube'|'image'|'list'|'gallery'`.
- Schemas: `heroSchema {title,coupleName,date}`; `eventItemSchema {name,date,timeStart,timeEnd,venue,mapsUrl}`; `closingSchema {body}`; `countdownSchema {targetDate}`.
- Base `HeroSection` date line: `<p v-if="content.date">{{ content.date }}</p>`. Elegant Hero: `<p v-if="content.date" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ content.date }}</p>`.
- Base `EventSection` date: `<p class="mt-2">{{ e.date }}</p>`. Elegant Event: `<p>{{ e.date }}</p>`.
- Base `ClosingSection`: `{ body }` only — `<section class="px-6 py-12 text-center"><p class="mx-auto max-w-xl whitespace-pre-line">{{ content.body }}</p></section>`. Elegant Closing: divider + `<p ... italic ...>{{ content.body }}</p>`.
- `formatDate` for a non-ISO string returns it unchanged, so existing tests using dates like `'1 Sep 2026'` / `'1 Sep'` stay green; no existing test asserts a raw `'2026-09-01'`.
- Components import app utils via `~/utils/...`.

---

## File Structure

- Create `app/utils/date-format.ts` — `DATE_FORMATS`, `formatDate`.
- Create `app/components/editor/controls/DateFormatControl.vue`; modify `app/components/editor/FieldEditor.vue`, `app/components/editor/controls/DateControl.vue`.
- Modify `server/registry/sections.ts` — schemas + descriptors + `FieldType`.
- Modify base `sections/{HeroSection,EventSection,ClosingSection}.vue` + elegant `themes/elegant/{HeroSection,EventSection,ClosingSection}.vue`.
- Modify `server/db/seed.ts`.
- Tests: `tests/utils/date-format.test.ts`, `tests/registry/sections.test.ts`, `tests/components/*` (per render task), `tests/components/field-editor.test.ts`.

---

## Task 1: `formatDate` + `DATE_FORMATS`

**Files:** Create `app/utils/date-format.ts`; Test `tests/utils/date-format.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { formatDate, DATE_FORMATS } from '../../app/utils/date-format'

describe('formatDate', () => {
  it('DD MMMM YYYY (default)', () => {
    expect(formatDate('2026-09-01')).toBe('01 September 2026')
    expect(formatDate('2026-09-01', 'DD MMMM YYYY')).toBe('01 September 2026')
  })
  it('dddd, DD MMMM YYYY', () => {
    expect(formatDate('2026-09-01', 'dddd, DD MMMM YYYY')).toBe('Selasa, 01 September 2026')
  })
  it('numeric formats', () => {
    expect(formatDate('2026-09-01', 'DD/MM/YYYY')).toBe('01/09/2026')
    expect(formatDate('2026-09-01', 'DD-MM-YYYY')).toBe('01-09-2026')
  })
  it('accepts a datetime string (uses the date part)', () => {
    expect(formatDate('2026-09-01T08:30')).toBe('01 September 2026')
  })
  it('empty → empty, non-date → unchanged, unknown format → default', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate('besok')).toBe('besok')
    expect(formatDate('2026-09-01', 'WAT')).toBe('01 September 2026')
  })
})

describe('DATE_FORMATS', () => {
  it('has presets incl. the default', () => {
    expect(DATE_FORMATS.length).toBeGreaterThanOrEqual(3)
    expect(DATE_FORMATS.map((f) => f.id)).toContain('DD MMMM YYYY')
  })
})
```
(Note: 2026-09-01 is a Tuesday → `Selasa` in id-ID. If the runtime's ICU returns a different casing/spelling, adjust the expected weekday to match `Intl.DateTimeFormat('id-ID',{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,8,1)))` — but it is `Selasa`.)

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/utils/date-format.test.ts`

- [ ] **Step 3: Implement `app/utils/date-format.ts`**

```ts
export const DATE_FORMATS: { id: string; example: string }[] = [
  { id: 'DD MMMM YYYY', example: '01 September 2026' },
  { id: 'dddd, DD MMMM YYYY', example: 'Selasa, 01 September 2026' },
  { id: 'DD/MM/YYYY', example: '01/09/2026' },
  { id: 'DD-MM-YYYY', example: '01-09-2026' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// Formats an ISO date (date or datetime) per the preset, id-ID, UTC-anchored to
// avoid timezone off-by-one. Non-date input is returned unchanged; empty → ''.
export function formatDate(iso: string, format = 'DD MMMM YYYY'): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  const date = new Date(Date.UTC(y, mo - 1, d))
  const monthLong = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(date)
  const weekdayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'UTC' }).format(date)
  switch (format) {
    case 'dddd, DD MMMM YYYY': return `${weekdayLong}, ${pad(d)} ${monthLong} ${y}`
    case 'DD/MM/YYYY': return `${pad(d)}/${pad(mo)}/${y}`
    case 'DD-MM-YYYY': return `${pad(d)}-${pad(mo)}-${y}`
    default: return `${pad(d)} ${monthLong} ${y}`
  }
}
```

- [ ] **Step 4: Run, confirm PASS** — `npx vitest run tests/utils/date-format.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/utils/date-format.ts tests/utils/date-format.test.ts
git commit -m "feat: formatDate + DATE_FORMATS presets (id-ID, date-only)"
```

---

## Task 2: Date-only control + DateFormatControl + field type

**Files:**
- Modify: `app/components/editor/controls/DateControl.vue`, `app/components/editor/FieldEditor.vue`, `server/registry/sections.ts` (FieldType union)
- Create: `app/components/editor/controls/DateFormatControl.vue`
- Test: `tests/components/field-editor.test.ts`, `tests/components/date-format-control.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/date-format-control.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateFormatControl from '../../app/components/editor/controls/DateFormatControl.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'
import { DATE_FORMATS } from '../../app/utils/date-format'

describe('DateFormatControl', () => {
  it('lists the preset formats', () => {
    const w = mount(DateFormatControl, { props: { modelValue: 'DD MMMM YYYY', label: 'Format' }, global: { stubs: nuxtUiStubs } })
    for (const f of DATE_FORMATS) expect(w.find('select').text()).toContain(f.id)
  })
})
```

Add to `tests/components/field-editor.test.ts` (reuse its existing `opts`/imports):
```ts
import DateFormatControl from '../../app/components/editor/controls/DateFormatControl.vue'

it('maps the dateformat field type to DateFormatControl', () => {
  const w = mount(FieldEditor, { props: { descriptor: { key: 'dateFormat', type: 'dateformat', label: 'Format' }, modelValue: 'DD MMMM YYYY' }, ...opts })
  expect(w.findComponent(DateFormatControl).exists()).toBe(true)
})
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/components/date-format-control.test.ts`

- [ ] **Step 3: DateControl → date-only**

Replace the input in `app/components/editor/controls/DateControl.vue`:
```vue
    <UInput type="date" :model-value="modelValue" class="w-full" @update:model-value="$emit('update:modelValue', String($event))" />
```

- [ ] **Step 4: Create DateFormatControl**

`app/components/editor/controls/DateFormatControl.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { DATE_FORMATS } from '~/utils/date-format'
const props = defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
const items = computed(() => DATE_FORMATS.map((f) => ({ label: `${f.id} — ${f.example}`, value: f.id })))
</script>
<template>
  <UFormField :label="label">
    <USelect :model-value="props.modelValue || 'DD MMMM YYYY'" :items="items" class="w-full" @update:model-value="$emit('update:modelValue', String($event))" />
  </UFormField>
</template>
```

- [ ] **Step 5: Register the field type**

In `server/registry/sections.ts`, extend `FieldType`:
```ts
export type FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list' | 'gallery' | 'dateformat'
```
In `app/components/editor/FieldEditor.vue`, add `import DateFormatControl from './controls/DateFormatControl.vue'` and add `dateformat: DateFormatControl` to the control map.

- [ ] **Step 6: Run, confirm PASS**

Run: `npx vitest run tests/components/date-format-control.test.ts tests/components/field-editor.test.ts`
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0)

- [ ] **Step 7: Commit**

```bash
git add app/components/editor/controls/DateControl.vue app/components/editor/controls/DateFormatControl.vue app/components/editor/FieldEditor.vue server/registry/sections.ts tests/components/date-format-control.test.ts tests/components/field-editor.test.ts
git commit -m "feat: date-only DateControl + DateFormatControl (dateformat field type)"
```

---

## Task 3: Registry schemas + descriptors

**Files:** Modify `server/registry/sections.ts`; Test `tests/registry/sections.test.ts`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/registry/sections.test.ts`:
```ts
describe('package A schema fields', () => {
  it('hero defaults dateFormat', () => {
    expect(validateContent('hero', {}).dateFormat).toBe('DD MMMM YYYY')
  })
  it('event item defaults dateFormat', () => {
    const out = validateContent('event', { events: [{ name: 'Resepsi' }] })
    expect(out.events[0].dateFormat).toBe('DD MMMM YYYY')
  })
  it('closing keeps greeting + body', () => {
    expect(validateContent('closing', { greeting: 'Om Swastiastu', body: 'x' })).toEqual({ greeting: 'Om Swastiastu', body: 'x' })
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/registry/sections.test.ts -t "package A schema fields"`

- [ ] **Step 3: Update schemas + descriptors**

In `server/registry/sections.ts`:
- `heroSchema`: add `dateFormat: z.string().default('DD MMMM YYYY'),`
- `eventItemSchema`: add `dateFormat: z.string().default('DD MMMM YYYY'),`
- `closingSchema`: change to `z.object({ greeting: z.string().default(''), body: z.string().default('') })`
- Hero `fields`: add after `date`: `dateFormat: { type: 'dateformat' as const, label: 'Format Tanggal' },`
- Event item `fields`: add after `date`: `dateFormat: { type: 'dateformat' as const, label: 'Format Tanggal' },`
- Closing `fields`: change to:
```ts
    fields: {
      greeting: { type: 'text' as const, label: 'Salam' },
      body: { type: 'longtext' as const, label: 'Isi' },
    },
```

- [ ] **Step 4: Run, confirm PASS** — `npx vitest run tests/registry/sections.test.ts`

- [ ] **Step 5: Commit**

```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: hero/event dateFormat + closing greeting in the registry"
```

---

## Task 4: Base render (Hero, Event, Closing)

**Files:** Modify base `sections/{HeroSection,EventSection,ClosingSection}.vue`; Test `tests/components/package-a-base.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/package-a-base.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/sections/HeroSection.vue'
import Event from '../../app/components/invitation/sections/EventSection.vue'
import Closing from '../../app/components/invitation/sections/ClosingSection.vue'

describe('package A base render', () => {
  it('Hero formats the date with the chosen preset', () => {
    const w = mount(Hero, { props: { content: { title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD/MM/YYYY' } } })
    expect(w.text()).toContain('01/09/2026')
  })
  it('Event formats the date', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '', timeEnd: '', venue: '', mapsUrl: '' }] } } })
    expect(w.text()).toContain('01 September 2026')
  })
  it('Closing renders greeting + body', () => {
    const w = mount(Closing, { props: { content: { greeting: 'Om Swastiastu', body: 'Terima kasih' } } })
    expect(w.text()).toContain('Om Swastiastu'); expect(w.text()).toContain('Terima kasih')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/components/package-a-base.test.ts`

- [ ] **Step 3: Update the base components**

`HeroSection.vue` — props add `dateFormat`, import + use `formatDate`:
```vue
<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string } }>()
</script>
<template>
  <section class="py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ content.title }}</p>
    <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
  </section>
</template>
```

`EventSection.vue` — event item type add `dateFormat`, format the date line:
```vue
<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { events: Array<{ name: string; date: string; dateFormat: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-8 px-6 py-12">
    <div v-for="(e, i) in content.events" :key="i" class="rounded-lg p-6 text-center" style="background: var(--color-bg)">
      <h3 class="text-xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p class="mt-2">{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener" class="mt-3 inline-block rounded px-4 py-2 text-white" style="background: var(--color-primary)">Lihat Lokasi</a>
    </div>
  </section>
</template>
```

`ClosingSection.vue` — props `{greeting, body}`, render greeting heading:
```vue
<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 v-if="content.greeting" class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-3 max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>
```

- [ ] **Step 4: Run, confirm PASS + no regressions**

Run: `npx vitest run tests/components/package-a-base.test.ts tests/components/sections.test.ts tests/components/InvitationRoot.test.ts` — all pass.

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/sections/HeroSection.vue app/components/invitation/sections/EventSection.vue app/components/invitation/sections/ClosingSection.vue tests/components/package-a-base.test.ts
git commit -m "feat: base Hero/Event format dates + Closing greeting"
```

---

## Task 5: Elegant render (Hero, Event, Closing)

**Files:** Modify elegant `themes/elegant/{HeroSection,EventSection,ClosingSection}.vue`; Test `tests/components/package-a-elegant.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/package-a-elegant.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/themes/elegant/HeroSection.vue'
import Event from '../../app/components/invitation/themes/elegant/EventSection.vue'
import Closing from '../../app/components/invitation/themes/elegant/ClosingSection.vue'

describe('package A elegant render', () => {
  it('Hero formats the date', () => {
    const w = mount(Hero, { props: { content: { title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD/MM/YYYY' } } })
    expect(w.text()).toContain('01/09/2026')
  })
  it('Event formats the date', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '', timeEnd: '', venue: '', mapsUrl: '' }] } } })
    expect(w.text()).toContain('01 September 2026')
  })
  it('Closing renders greeting + body', () => {
    const w = mount(Closing, { props: { content: { greeting: 'Om Swastiastu', body: 'Terima kasih' } } })
    expect(w.text()).toContain('Om Swastiastu'); expect(w.text()).toContain('Terima kasih')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/components/package-a-elegant.test.ts`

- [ ] **Step 3: Update the elegant components**

`themes/elegant/HeroSection.vue` — add `dateFormat` to props, import `formatDate`, format the date eyebrow:
```vue
<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string } }>()
</script>
<template>
  <section class="py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ formatDate(content.date, content.dateFormat) }}</p>
    <div class="mx-auto my-6 h-px w-16" style="background: var(--color-secondary)" />
    <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p class="mt-4 uppercase tracking-[0.25em]" style="color: var(--color-secondary)">{{ content.title }}</p>
  </section>
</template>
```

`themes/elegant/EventSection.vue` — add `dateFormat`, format the date:
```vue
<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { events: Array<{ name: string; date: string; dateFormat: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-6 px-6 py-16">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md rounded-lg border p-6 text-center" style="border-color: var(--color-secondary); background: var(--color-bg)">
      <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <div class="mx-auto my-3 h-px w-12" style="background: var(--color-secondary)" />
      <p>{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1 text-sm">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener" class="mt-4 inline-block rounded-full border px-5 py-2 text-sm uppercase tracking-wider" style="border-color: var(--color-primary); color: var(--color-primary)">Lihat Lokasi</a>
    </div>
  </section>
</template>
```

`themes/elegant/ClosingSection.vue` — props `{greeting, body}`, greeting heading above the divider:
```vue
<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-16 text-center" style="color: var(--color-text)">
    <h2 v-if="content.greeting" class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
    <p class="mx-auto max-w-xl whitespace-pre-line italic leading-relaxed">{{ content.body }}</p>
  </section>
</template>
```

- [ ] **Step 4: Run, confirm PASS + no regressions**

Run: `npx vitest run tests/components/package-a-elegant.test.ts tests/components/elegant-sections.test.ts tests/components/elegant-cards.test.ts tests/components/elegant-text.test.ts` — all pass.

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/themes/elegant/HeroSection.vue app/components/invitation/themes/elegant/EventSection.vue app/components/invitation/themes/elegant/ClosingSection.vue tests/components/package-a-elegant.test.ts
git commit -m "feat: elegant Hero/Event format dates + Closing greeting"
```

---

## Task 6: Seed date-only + verification gate

**Files:** Modify `server/db/seed.ts` (verification only otherwise).

- [ ] **Step 1: Date-only seed countdown**

In `server/db/seed.ts`, the `seedContent` for `countdown` returns `{ ...base, targetDate: '2026-09-01T08:00:00' }`. Change it to a date-only value:
```ts
  if (type === 'countdown') return { ...base, targetDate: '2026-09-01' }
```

- [ ] **Step 2: Full suite + typecheck**

Run: `npx vitest run` — all pass (prior 196 + the new date-format/render/registry cases).
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 3: Sanity**

Run:
```bash
grep -c "type=\"date\"" app/components/editor/controls/DateControl.vue
grep -c "dateformat" server/registry/sections.ts app/components/editor/FieldEditor.vue
grep -c "formatDate" app/components/invitation/sections/HeroSection.vue app/components/invitation/themes/elegant/HeroSection.vue
```
Expected: DateControl date-only; dateformat field type registered; formatDate used in both Hero variants.

- [ ] **Step 4: Commit (if seed changed)**

```bash
git add server/db/seed.ts
git commit -m "chore: date-only countdown in the seed (package A)"
```

---

## Self-Review (done at write time)

- **Spec §3 (date utils):** Task 1. ✅
- **Spec §4 (DateFormatControl + date-only DateControl + field type):** Task 2. ✅
- **Spec §5 (registry schema/descriptors):** Task 3. ✅
- **Spec §6 (base + elegant render):** Task 4 (base) + Task 5 (elegant). ✅
- **Spec §7 (seed):** Task 6. ✅
- **Spec §8 (testing):** pure formatDate (T1), control + map (T2), registry defaults (T3), base render (T4), elegant render (T5). ✅
- **Spec §10 success criteria:** 1→T2 (date-only DateControl), 2→T4+T5 (formatDate in both packs), 3→T2 date-only + countdown unchanged (midnight), 4→T3+T4+T5 (closing greeting). ✅
- **Placeholder scan:** none.
- **Type consistency:** `formatDate(iso, format)` / `DATE_FORMATS` used in Tasks 1/2/4/5; `dateFormat: string` added to hero + event item props (Tasks 3/4/5); `'dateformat'` field type in `FieldType` + FieldEditor + descriptors; closing `{greeting, body}` in schema (T3) + both render variants (T4/T5). ✅
- **No regressions:** existing hero/event tests use non-ISO dates (`'1 Sep 2026'`, `'1 Sep'`) → `formatDate` returns them unchanged; no test asserts a raw `'2026-09-01'` (verified). ✅
- **No migration.** ✅
```

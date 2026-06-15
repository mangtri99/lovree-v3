# Elegant Pack — All Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `elegant` theme pack so it overrides every section with a cohesive elegant restyle, extracting the RSVP form logic into a shared composable.

**Architecture:** Add an elegant variant component per section under `themes/elegant/` (same `content` props/behavior as base, elegant markup reading the same CSS vars), register each in `themePacks.ts`. The RSVP submit path is extracted to `useRsvpForm()` and consumed by both base and elegant RSVP.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Vitest + @vue/test-utils.

**Branch:** `feat/phase-2b-media`.

**Grounding facts:**
- `themePacks.ts` (existing): `const packs = { elegant: { hero, couple } }`; `resolveSectionComponent(themeKey, type) = packs[themeKey]?.[type] ?? base[type] ?? null`. `base` = `sectionComponents`.
- `tests/components/theme-packs.test.ts` currently asserts `resolveSectionComponent('elegant','footer')` === base `FooterSection` (a fallback case). Once Footer is overridden this must change to test fallback via an **unknown theme key** instead.
- Base section prop shapes (verbatim from the components): Opening `{greeting,body}`; Closing `{body}`; Quote `{text,source}`; Custom `{title, items:{label,value}[]}` (filter rows where label||value non-empty); Footer `{text}`; Event `{events:{name,date,timeStart,timeEnd,venue,mapsUrl}[]}`; LoveGift `{note, banks:{bank,number,holder}[]}`; Info `{phone, socials:{label,url}[]}`; Countdown `{targetDate}` (hydration-safe clock); Gallery `{items:{mediaId,url}[]}` (filter url); Video `{videos:{videoId}[]}` (filter valid 11-char); Rsvp `{title}` (submit form); Guestbook `{title}` (inject `guestbook`).
- RSVP/Guestbook use `inject('guestbook')` (reactive ref), and RSVP also `inject('guestName'|'slug'|'guestCode')`; RSVP posts to `/api/invitations/:slug/rsvp`.
- `YouTubeEmbed` is a global auto-imported component (stub in tests).
- Elegant design language: serif **italic** headings (`font-family: var(--font-heading); color: var(--color-primary)`), thin divider `<div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />`, eyebrow `text-xs uppercase tracking-[0.2em]` in `--color-secondary`, `px-6 py-16`, card `border` with `border-color: var(--color-secondary)`, accent links/buttons in `--color-accent`/`--color-primary`.

---

## File Structure

- Create `app/composables/useRsvpForm.ts`; modify `app/components/invitation/sections/RsvpSection.vue` (consume it).
- Create elegant variants under `app/components/invitation/themes/elegant/`: `OpeningSection`, `ClosingSection`, `QuoteSection`, `CustomSection`, `FooterSection`, `EventSection`, `LoveGiftSection`, `InfoSection`, `CountdownSection`, `GallerySection`, `VideoSection`, `RsvpSection`, `GuestbookSection`.
- Modify `app/components/invitation/themePacks.ts` (register all).
- Tests: `tests/composables/use-rsvp-form.test.ts`, `tests/components/elegant-text.test.ts`, `tests/components/elegant-cards.test.ts`, `tests/components/elegant-media.test.ts`, `tests/components/elegant-rsvp.test.ts`, and an update to `tests/components/theme-packs.test.ts`.

---

## Task 1: Extract `useRsvpForm` + refactor base RsvpSection

**Files:**
- Create: `app/composables/useRsvpForm.ts`
- Modify: `app/components/invitation/sections/RsvpSection.vue`, `tests/components/theme-packs.test.ts`
- Test: `tests/composables/use-rsvp-form.test.ts`

- [ ] **Step 1: Write the failing composable test**

Create `tests/composables/use-rsvp-form.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useRsvpForm } from '../../app/composables/useRsvpForm'

const fetchMock = vi.fn()
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('$fetch', fetchMock) })

function host() {
  return defineComponent({ setup: () => { const f = useRsvpForm(); return { f } }, render: () => h('div') })
}

describe('useRsvpForm', () => {
  it('prefills name from guestName and submits, prepending a messaged entry', async () => {
    const entry = { name: 'Budi', message: 'Selamat', attendance: 'yes' }
    fetchMock.mockResolvedValue({ ok: true, entry })
    const guestbook = ref<any[]>([])
    const w = mount(host(), { global: { provide: { guestbook, guestName: 'Budi', slug: 'elrumi', guestCode: 'budi-x7k2' } } })
    const f = (w.vm as any).f
    expect(f.name.value).toBe('Budi')
    f.message.value = 'Selamat'
    await f.submit()
    expect(fetchMock).toHaveBeenCalledWith('/api/invitations/elrumi/rsvp', expect.objectContaining({
      method: 'POST', body: expect.objectContaining({ name: 'Budi', attendance: 'yes', message: 'Selamat', guest: 'budi-x7k2' }),
    }))
    expect(guestbook.value[0]).toEqual(entry)
    expect(f.done.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/composables/use-rsvp-form.test.ts`
Expected: FAIL — composable does not exist.

- [ ] **Step 3: Create `app/composables/useRsvpForm.ts`**

```ts
import { ref, inject } from 'vue'

export function useRsvpForm() {
  const guestbook = inject<any>('guestbook', ref([]))
  const guestName = inject<string>('guestName', '')
  const slug = inject<string>('slug', '')
  const guest = inject<string>('guestCode', '') || undefined

  const name = ref(guestName || '')
  const attendance = ref<'yes' | 'no' | 'maybe'>('yes')
  const message = ref('')
  const submitting = ref(false)
  const done = ref(false)
  const error = ref('')

  async function submit() {
    if (!name.value.trim() || submitting.value) return
    submitting.value = true
    error.value = ''
    try {
      const res = await $fetch<{ ok: boolean; entry: { name: string; message: string; attendance: string } }>(`/api/invitations/${slug}/rsvp`, {
        method: 'POST',
        body: { name: name.value.trim(), attendance: attendance.value, message: message.value, guest },
      })
      if (res?.entry && (res.entry.message ?? '').trim()) guestbook.value.unshift(res.entry)
      done.value = true
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Gagal mengirim'
    } finally {
      submitting.value = false
    }
  }

  return { name, attendance, message, submitting, done, error, submit }
}
```

- [ ] **Step 4: Refactor base RsvpSection to use it**

Replace the `<script setup>` of `app/components/invitation/sections/RsvpSection.vue` with (template UNCHANGED):
```ts
import { useRsvpForm } from '~/composables/useRsvpForm'
defineProps<{ content: { title: string } }>()
const { name, attendance, message, submitting, done, error, submit } = useRsvpForm()
```
(Delete the inline inject/refs/submit; the template already binds `name`/`attendance`/`message`/`submit`/`done`/`error`/`submitting`.)

- [ ] **Step 5: Fix the theme-packs fallback test (footer will be overridden later)**

In `tests/components/theme-packs.test.ts`, replace the `falls back to the base component for a non-overridden section` test (which uses `('elegant','footer')`) with a fallback that does NOT depend on which sections elegant overrides:
```ts
  it('falls back to the base component for an unknown theme key', () => {
    expect(resolveSectionComponent('nope', 'footer')).toBe(FooterSection)
  })
```
(Keep the other three cases.)

- [ ] **Step 6: Run + verify**

Run: `npx vitest run tests/composables/use-rsvp-form.test.ts tests/components/theme-packs.test.ts tests/components/rsvp-section.test.ts` — all PASS (the base RsvpSection test still passes via the composable).
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0.

- [ ] **Step 7: Commit**

```bash
git add app/composables/useRsvpForm.ts app/components/invitation/sections/RsvpSection.vue tests/composables/use-rsvp-form.test.ts tests/components/theme-packs.test.ts
git commit -m "refactor: extract useRsvpForm composable; base RsvpSection consumes it"
```

---

## Task 2: Elegant text sections (Opening, Closing, Quote, Custom, Footer)

**Files:**
- Create: `app/components/invitation/themes/elegant/{OpeningSection,ClosingSection,QuoteSection,CustomSection,FooterSection}.vue`
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/elegant-text.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/elegant-text.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Opening from '../../app/components/invitation/themes/elegant/OpeningSection.vue'
import Closing from '../../app/components/invitation/themes/elegant/ClosingSection.vue'
import Quote from '../../app/components/invitation/themes/elegant/QuoteSection.vue'
import Custom from '../../app/components/invitation/themes/elegant/CustomSection.vue'
import Footer from '../../app/components/invitation/themes/elegant/FooterSection.vue'

describe('elegant text sections', () => {
  it('Opening renders greeting + body', () => {
    const w = mount(Opening, { props: { content: { greeting: 'Om Swastiastu', body: 'Selamat datang' } } })
    expect(w.text()).toContain('Om Swastiastu'); expect(w.text()).toContain('Selamat datang')
  })
  it('Closing renders body', () => {
    expect(mount(Closing, { props: { content: { body: 'Terima kasih' } } }).text()).toContain('Terima kasih')
  })
  it('Quote renders text + source', () => {
    const w = mount(Quote, { props: { content: { text: 'Cinta', source: 'QS' } } })
    expect(w.text()).toContain('Cinta'); expect(w.text()).toContain('QS')
  })
  it('Custom renders title + non-empty rows, skipping empties', () => {
    const w = mount(Custom, { props: { content: { title: 'Info', items: [{ label: 'Dress', value: 'Batik' }, { label: '', value: '' }] } } })
    expect(w.text()).toContain('Info'); expect(w.text()).toContain('Dress'); expect(w.text()).toContain('Batik')
    expect(w.findAll('[data-row]').length).toBe(1)
  })
  it('Footer renders text', () => {
    expect(mount(Footer, { props: { content: { text: 'Salam' } } }).text()).toContain('Salam')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/elegant-text.test.ts`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Create the components**

`OpeningSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-3xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
    <p class="mx-auto max-w-xl whitespace-pre-line leading-relaxed">{{ content.body }}</p>
  </section>
</template>
```

`ClosingSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { body: string } }>()
</script>
<template>
  <section class="px-6 py-16 text-center" style="color: var(--color-text)">
    <div class="mx-auto mb-5 h-px w-16" style="background: var(--color-secondary)" />
    <p class="mx-auto max-w-xl whitespace-pre-line italic leading-relaxed">{{ content.body }}</p>
  </section>
</template>
```

`QuoteSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { text: string; source: string } }>()
</script>
<template>
  <section class="px-6 py-16 text-center" style="background: var(--color-bg)">
    <blockquote class="mx-auto max-w-xl text-2xl italic leading-relaxed" style="font-family: var(--font-heading); color: var(--color-primary)">&ldquo;{{ content.text }}&rdquo;</blockquote>
    <div class="mx-auto my-4 h-px w-12" style="background: var(--color-secondary)" />
    <p v-if="content.source" class="text-sm uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ content.source }}</p>
  </section>
</template>
```

`CustomSection.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
type Row = { label: string; value: string }
const props = defineProps<{ content: { title: string; items: Row[] } }>()
const rows = computed(() => (props.content.items ?? []).filter((r) => (r.label ?? '') !== '' || (r.value ?? '') !== ''))
</script>
<template>
  <section class="px-6 py-16 text-center" style="color: var(--color-text)">
    <h2 v-if="content.title" class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div v-if="content.title" class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <div class="mx-auto mt-2 max-w-md space-y-4">
      <div v-for="(row, i) in rows" :key="i" data-row>
        <p v-if="row.label" class="text-xs uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ row.label }}</p>
        <p v-if="row.value" data-value class="mt-1 whitespace-pre-line">{{ row.value }}</p>
      </div>
    </div>
  </section>
</template>
```

`FooterSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <footer class="px-6 py-12 text-center text-sm uppercase tracking-[0.25em]" style="background: var(--color-primary); color: white">
    {{ content.text || 'Made with Lovree' }}
  </footer>
</template>
```

- [ ] **Step 4: Register in themePacks**

In `app/components/invitation/themePacks.ts`, add imports and extend the `elegant` pack:
```ts
import ElegantOpening from './themes/elegant/OpeningSection.vue'
import ElegantClosing from './themes/elegant/ClosingSection.vue'
import ElegantQuote from './themes/elegant/QuoteSection.vue'
import ElegantCustom from './themes/elegant/CustomSection.vue'
import ElegantFooter from './themes/elegant/FooterSection.vue'
```
and in `packs.elegant`, add: `opening: ElegantOpening, closing: ElegantClosing, quote: ElegantQuote, custom: ElegantCustom, footer: ElegantFooter`.

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/elegant-text.test.ts tests/components/theme-packs.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/themes/elegant/OpeningSection.vue app/components/invitation/themes/elegant/ClosingSection.vue app/components/invitation/themes/elegant/QuoteSection.vue app/components/invitation/themes/elegant/CustomSection.vue app/components/invitation/themes/elegant/FooterSection.vue app/components/invitation/themePacks.ts tests/components/elegant-text.test.ts
git commit -m "feat: elegant Opening/Closing/Quote/Custom/Footer sections"
```

---

## Task 3: Elegant card sections (Event, LoveGift, Info, Countdown)

**Files:**
- Create: `app/components/invitation/themes/elegant/{EventSection,LoveGiftSection,InfoSection,CountdownSection}.vue`
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/elegant-cards.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/elegant-cards.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Event from '../../app/components/invitation/themes/elegant/EventSection.vue'
import LoveGift from '../../app/components/invitation/themes/elegant/LoveGiftSection.vue'
import Info from '../../app/components/invitation/themes/elegant/InfoSection.vue'
import Countdown from '../../app/components/invitation/themes/elegant/CountdownSection.vue'

describe('elegant card sections', () => {
  it('Event renders event name/date/venue', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '1 Sep', timeStart: '09:00', timeEnd: '', venue: 'Bali', mapsUrl: '' }] } } })
    expect(w.text()).toContain('Resepsi'); expect(w.text()).toContain('Bali')
  })
  it('LoveGift renders a bank account', () => {
    const w = mount(LoveGift, { props: { content: { note: 'Hadiah', banks: [{ bank: 'BCA', number: '123', holder: 'Willy' }] } } })
    expect(w.text()).toContain('BCA'); expect(w.text()).toContain('123'); expect(w.text()).toContain('Willy')
  })
  it('Info renders phone + social', () => {
    const w = mount(Info, { props: { content: { phone: '0812', socials: [{ label: 'IG', url: 'https://x' }] } } })
    expect(w.text()).toContain('0812'); expect(w.text()).toContain('IG')
  })
  it('Countdown renders unit labels', () => {
    const w = mount(Countdown, { props: { content: { targetDate: '2099-01-01T00:00:00' } } })
    expect(w.text()).toContain('Hari'); expect(w.text()).toContain('Detik')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/elegant-cards.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the components**

`EventSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { events: Array<{ name: string; date: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-6 px-6 py-16">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md rounded-lg border p-6 text-center" style="border-color: var(--color-secondary); background: var(--color-bg)">
      <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <div class="mx-auto my-3 h-px w-12" style="background: var(--color-secondary)" />
      <p>{{ e.date }}</p>
      <p v-if="e.timeStart">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1 text-sm">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener" class="mt-4 inline-block rounded-full border px-5 py-2 text-sm uppercase tracking-wider" style="border-color: var(--color-primary); color: var(--color-primary)">Lihat Lokasi</a>
    </div>
  </section>
</template>
```

`LoveGiftSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { note: string; banks: Array<{ bank: string; number: string; holder: string }> } }>()
</script>
<template>
  <section class="px-6 py-16 text-center">
    <h2 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">Love Gift</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="content.note" class="mx-auto max-w-xl">{{ content.note }}</p>
    <div class="mx-auto mt-6 max-w-sm space-y-3">
      <div v-for="(b, i) in content.banks" :key="i" class="rounded-lg border p-4" style="border-color: var(--color-secondary)">
        <div class="text-xs uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ b.bank }}</div>
        <div class="mt-1 text-lg tracking-[0.2em]">{{ b.number }}</div>
        <div class="mt-1 text-sm">a.n. {{ b.holder }}</div>
      </div>
    </div>
  </section>
</template>
```

`InfoSection.vue`:
```vue
<script setup lang="ts">
defineProps<{ content: { phone: string; socials: Array<{ label: string; url: string }> } }>()
</script>
<template>
  <section class="px-6 py-16 text-center">
    <h2 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">Info Lebih Lanjut</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="content.phone" class="mt-1">{{ content.phone }}</p>
    <div class="mt-3 flex justify-center gap-5">
      <a v-for="(s, i) in content.socials" :key="i" :href="s.url" target="_blank" rel="noopener" class="text-sm uppercase tracking-wider" style="color: var(--color-accent)">{{ s.label }}</a>
    </div>
  </section>
</template>
```

`CountdownSection.vue` (copy the base script verbatim — keep the hydration-safe clock — only the template differs):
```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
const props = defineProps<{ content: { targetDate: string } }>()
const now = ref(0)
let timer: ReturnType<typeof setInterval>
onMounted(() => { now.value = Date.now(); timer = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => clearInterval(timer))
const remain = computed(() => {
  if (now.value === 0) return { d: 0, h: 0, m: 0, s: 0 }
  const diff = Math.max(0, new Date(props.content.targetDate).getTime() - now.value)
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
})
const units: Array<[string, 'D' | 'H' | 'M' | 'S']> = [['Hari', 'D'], ['Jam', 'H'], ['Menit', 'M'], ['Detik', 'S']]
</script>
<template>
  <section class="px-6 py-16 text-center">
    <div class="flex justify-center gap-6">
      <div v-for="[label, key] in units" :key="label" class="min-w-14">
        <div class="text-4xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ key === 'D' ? remain.d : key === 'H' ? remain.h : key === 'M' ? remain.m : remain.s }}</div>
        <div class="mt-1 text-xs uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ label }}</div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Register**

In `themePacks.ts`, add imports `ElegantEvent`, `ElegantLoveGift`, `ElegantInfo`, `ElegantCountdown` (from the four files) and add to `packs.elegant`: `event: ElegantEvent, love_gift: ElegantLoveGift, info: ElegantInfo, countdown: ElegantCountdown`.

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/elegant-cards.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/themes/elegant/EventSection.vue app/components/invitation/themes/elegant/LoveGiftSection.vue app/components/invitation/themes/elegant/InfoSection.vue app/components/invitation/themes/elegant/CountdownSection.vue app/components/invitation/themePacks.ts tests/components/elegant-cards.test.ts
git commit -m "feat: elegant Event/LoveGift/Info/Countdown sections"
```

---

## Task 4: Elegant media sections (Gallery, Video)

**Files:**
- Create: `app/components/invitation/themes/elegant/{GallerySection,VideoSection}.vue`
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/elegant-media.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/elegant-media.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Gallery from '../../app/components/invitation/themes/elegant/GallerySection.vue'
import Video from '../../app/components/invitation/themes/elegant/VideoSection.vue'

const stubs = { YouTubeEmbed: { name: 'YouTubeEmbed', props: ['videoId'], template: '<div class="yt" />' } }

describe('elegant media sections', () => {
  it('Gallery renders an img per non-empty url', () => {
    const w = mount(Gallery, { props: { content: { items: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, { mediaId: '', url: '' }] } } })
    expect(w.findAll('img').length).toBe(1)
    expect(w.find('img').attributes('src')).toBe('https://cdn/a.jpg')
  })
  it('Video renders a YouTubeEmbed per valid id', () => {
    const w = mount(Video, { props: { content: { videos: [{ videoId: 'dQw4w9WgXcQ' }, { videoId: 'bad' }] } }, global: { stubs } })
    expect(w.findAllComponents({ name: 'YouTubeEmbed' }).length).toBe(1)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/elegant-media.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the components**

`GallerySection.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-6 py-16">
    <div class="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="aspect-square w-full rounded object-cover" loading="lazy" />
    </div>
  </section>
</template>
```

`VideoSection.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ content: { videos: { videoId: string }[] } }>()
const isValid = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id)
const renderable = computed(() => (props.content.videos ?? []).filter((v) => isValid(v.videoId)))
</script>
<template>
  <section class="mx-auto max-w-2xl space-y-6 px-6 py-16">
    <YouTubeEmbed v-for="(v, i) in renderable" :key="i" :video-id="v.videoId" />
  </section>
</template>
```

- [ ] **Step 4: Register**

In `themePacks.ts`, add imports `ElegantGallery`, `ElegantVideo` and add to `packs.elegant`: `gallery: ElegantGallery, video: ElegantVideo`.

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/elegant-media.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/themes/elegant/GallerySection.vue app/components/invitation/themes/elegant/VideoSection.vue app/components/invitation/themePacks.ts tests/components/elegant-media.test.ts
git commit -m "feat: elegant Gallery/Video sections"
```

---

## Task 5: Elegant Rsvp + Guestbook

**Files:**
- Create: `app/components/invitation/themes/elegant/{RsvpSection,GuestbookSection}.vue`
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/elegant-rsvp.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/elegant-rsvp.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import Rsvp from '../../app/components/invitation/themes/elegant/RsvpSection.vue'
import Guestbook from '../../app/components/invitation/themes/elegant/GuestbookSection.vue'

const fetchMock = vi.fn()
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('$fetch', fetchMock) })

describe('elegant rsvp + guestbook', () => {
  it('Rsvp submits and prepends a messaged entry', async () => {
    const entry = { name: 'Budi', message: 'Selamat', attendance: 'yes' }
    fetchMock.mockResolvedValue({ ok: true, entry })
    const guestbook = ref<any[]>([])
    const w = mount(Rsvp, { props: { content: { title: 'RSVP' } }, global: { provide: { guestbook, guestName: 'Budi', slug: 's', guestCode: 'c' } } })
    await w.find('textarea').setValue('Selamat')
    await w.find('form').trigger('submit.prevent')
    await nextTick(); await Promise.resolve(); await nextTick()
    expect(guestbook.value[0]).toEqual(entry)
    expect(w.text()).toContain('Terima kasih')
  })
  it('Guestbook renders injected entries + attendance label', () => {
    const guestbook = ref([{ name: 'Siti', message: 'Doa', attendance: 'yes' }])
    const w = mount(Guestbook, { props: { content: { title: 'Ucapan' } }, global: { provide: { guestbook } } })
    expect(w.text()).toContain('Siti'); expect(w.text()).toContain('Doa'); expect(w.text()).toContain('Hadir')
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/elegant-rsvp.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the components**

`RsvpSection.vue` (reuses the composable):
```vue
<script setup lang="ts">
import { useRsvpForm } from '~/composables/useRsvpForm'
defineProps<{ content: { title: string } }>()
const { name, attendance, message, submitting, done, error, submit } = useRsvpForm()
</script>
<template>
  <section class="px-6 py-16">
    <h2 class="text-center text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="done" class="mx-auto max-w-md text-center text-sm" style="color: var(--color-primary)">Terima kasih atas konfirmasi & doanya 🙏</p>
    <form v-else class="mx-auto mt-2 max-w-md space-y-3" @submit.prevent="submit">
      <input v-model="name" placeholder="Nama" class="w-full rounded border bg-transparent p-2" style="border-color: var(--color-secondary)" />
      <select v-model="attendance" class="w-full rounded border bg-transparent p-2" style="border-color: var(--color-secondary)">
        <option value="yes">Hadir</option>
        <option value="no">Tidak Hadir</option>
        <option value="maybe">Mungkin</option>
      </select>
      <textarea v-model="message" placeholder="Ucapan & Doa" class="w-full rounded border bg-transparent p-2" style="border-color: var(--color-secondary)" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="submitting" class="w-full rounded-full py-2 text-sm uppercase tracking-wider text-white" style="background: var(--color-primary)">{{ submitting ? 'Mengirim…' : 'Kirim' }}</button>
    </form>
  </section>
</template>
```

`GuestbookSection.vue`:
```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
defineProps<{ content: { title: string } }>()
const entries = inject<any>('guestbook', ref([]))
const label = (a: string | null) => (a === 'yes' ? 'Hadir' : a === 'no' ? 'Tidak Hadir' : a === 'maybe' ? 'Mungkin' : '')
</script>
<template>
  <section class="px-6 py-16">
    <h2 class="text-center text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="!entries.length" class="text-center text-sm" style="color: var(--color-secondary)">Belum ada ucapan.</p>
    <ul class="mx-auto mt-2 max-w-md space-y-3">
      <li v-for="(e, i) in entries" :key="i" class="rounded-lg border p-4" style="border-color: var(--color-secondary)">
        <div class="flex items-center gap-2">
          <span class="italic" style="font-family: var(--font-heading)">{{ e.name }}</span>
          <span v-if="label(e.attendance)" class="text-xs uppercase tracking-wider" style="color: var(--color-accent)">{{ label(e.attendance) }}</span>
        </div>
        <div class="mt-1 text-sm">{{ e.message }}</div>
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 4: Register**

In `themePacks.ts`, add imports `ElegantRsvp`, `ElegantGuestbook` and add to `packs.elegant`: `rsvp: ElegantRsvp, guestbook: ElegantGuestbook`.

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/elegant-rsvp.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/themes/elegant/RsvpSection.vue app/components/invitation/themes/elegant/GuestbookSection.vue app/components/invitation/themePacks.ts tests/components/elegant-rsvp.test.ts
git commit -m "feat: elegant Rsvp (via useRsvpForm) + Guestbook sections"
```

---

## Task 6: Resolver completeness + verification gate

**Files:**
- Modify: `tests/components/theme-packs.test.ts` (add a completeness check)

- [ ] **Step 1: Add a completeness test**

In `tests/components/theme-packs.test.ts`, add (import `sectionComponents` from `'../../app/components/invitation/sectionComponents'` and `resolveSectionComponent` already imported):
```ts
import { sectionComponents } from '../../app/components/invitation/sectionComponents'

it('elegant overrides every section type (no base fallback for known types)', () => {
  for (const type of Object.keys(sectionComponents)) {
    expect(resolveSectionComponent('elegant', type)).not.toBe(sectionComponents[type])
  }
})
```

- [ ] **Step 2: Run, confirm PASS**

Run: `npx vitest run tests/components/theme-packs.test.ts`
Expected: PASS (every base section type now has an elegant override).

- [ ] **Step 3: Full suite + typecheck**

Run: `npx vitest run` — all pass.
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 4: Sanity**

Run:
```bash
ls app/components/invitation/themes/elegant/ | wc -l   # expect 15 (.vue files: hero, couple + 13)
grep -c "Elegant" app/components/invitation/themePacks.ts
```
Expected: 15 files; all elegant components registered.

- [ ] **Step 5: Commit**

```bash
git add tests/components/theme-packs.test.ts
git commit -m "test: assert elegant pack overrides every section type"
```

---

## Self-Review (done at write time)

- **Spec §3 (elegant components for all sections):** Tasks 2 (5), 3 (4), 4 (2), 5 (2) = 13, plus existing hero/couple. ✅
- **Spec §4 (useRsvpForm + base refactor):** Task 1. ✅
- **Spec §5 (register all):** each task registers its batch; Task 6 asserts completeness. ✅
- **Spec §6 (testing):** composable (T1), per-section render (T2–T5), elegant RSVP submit (T5), resolver completeness (T6). ✅
- **Spec §8 success criteria:** 1→T2–T5 (+T6 completeness), 2→T1+T5 (shared composable; base RSVP test stays green), 3→pack overrides all, 4→T6 maps all 15. ✅
- **Placeholder scan:** none — every component's full code is in the plan.
- **Type consistency:** each elegant variant matches its base `content` prop shape exactly (verified against the read base components); `useRsvpForm()` returns `{ name, attendance, message, submitting, done, error, submit }` consumed identically by base + elegant RSVP. ✅
- **Test-breakage handled:** Task 1 rewrites the `theme-packs.test.ts` fallback case to use an unknown theme key (so adding the footer override in Task 2 doesn't break it). ✅
- **Countdown hydration:** elegant Countdown copies the base's `onMounted` clock verbatim (start at 0) — no SSR mismatch. ✅
- **No schema/data/migration changes.** ✅
```

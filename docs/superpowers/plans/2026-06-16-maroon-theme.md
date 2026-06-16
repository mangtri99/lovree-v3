# "Marun Klasik" Maroon Theme (full pack) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a luxury-classic "Marun Klasik" theme — a `CuratedTheme` (cream + maroon + gold, Fraunces/Lora) plus a full `maroon` component pack overriding all 17 section types and a bespoke cover, with inline-SVG gold ornaments (no vendored assets).

**Architecture:** Tokens + Fraunces font in the registry/allow-list; a per-section Vue pack under `themes/maroon/` registered in `themePacks` (`packs.maroon` + `covers.maroon`). Each pack component reuses its base component's `<script setup>` verbatim and swaps the `<template>` for cream/maroon/gold styling reading CSS vars. Ornaments are inline SVG (gold via `var(--color-accent)`), so components are asset-free (plain happy-dom tests).

**Tech Stack:** Nuxt 4, Vue 3, Tailwind, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-16-maroon-theme-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Conventions for every pack component task:**
- Read the base component at `app/components/invitation/sections/<X>Section.vue` first.
- Create `app/components/invitation/themes/maroon/<X>Section.vue`: **copy its `<script setup>` verbatim** (imports/props/logic), then replace ONLY the `<template>` with the maroon version.
- Do NOT register in `themePacks` until Task 7.
- Maroon language: section `style="background: var(--color-bg)"` (cream); body text inherits `var(--color-text)` (maroon-ink); headings `style="font-family: var(--font-heading); color: var(--color-primary)"` (Fraunces maroon); accents/borders/dividers use `var(--color-accent)` (gold).
- **Gold flourish divider** (inline, reuse where noted):
```html
<div class="my-8 flex justify-center" style="color: var(--color-accent)">
  <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true">
    <line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" />
    <circle cx="58" cy="8" r="1.5" fill="currentColor" />
    <path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" />
    <circle cx="74" cy="8" r="1.5" fill="currentColor" />
    <line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" />
  </svg>
</div>
```

---

## File Structure

- `server/theme/fonts.ts` (modify) — add `Fraunces` (heading).
- `server/theme/curated-themes.ts` (modify) — append the `Marun Klasik` curated theme (`key: 'maroon'`).
- `app/components/invitation/themes/maroon/<17 components>.vue` + `CoverModal.vue` (create).
- `app/components/invitation/themePacks.ts` (modify) — register `packs.maroon` + `covers.maroon`.
- Tests: `tests/theme/fonts.test.ts` (modify), `tests/theme/curated-themes.test.ts` (modify), `tests/components/theme-packs.test.ts` (modify), `tests/components/maroon.test.ts` (create).

---

### Task 1: Fraunces font + curated theme

**Files:**
- Modify: `server/theme/fonts.ts`, `server/theme/curated-themes.ts`
- Test: `tests/theme/fonts.test.ts`, `tests/theme/curated-themes.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/theme/fonts.test.ts` (inside `describe('curated fonts', …)`):

```ts
  it('includes Fraunces (heading)', () => {
    expect(HEADING_FONTS as readonly string[]).toContain('Fraunces')
    expect(googleFontsHref()).toContain('family=Fraunces')
  })
```

In `tests/theme/curated-themes.test.ts` (inside `describe('CURATED_THEMES', …)`):

```ts
  it('includes Marun Klasik (maroon pack, opts out of global ornament)', () => {
    const t = CURATED_THEMES.find((x) => x.name === 'Marun Klasik')
    expect(t).toBeTruthy()
    expect(t!.key).toBe('maroon')
    expect(t!.tokens.color.bg).toBe('#fbf6ee')
    expect(t!.tokens.ornament!.divider).toBe('none')
    expect(t!.tokens.ornament!.motif).toBe('none')
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/theme/fonts.test.ts tests/theme/curated-themes.test.ts`
Expected: FAIL — Fraunces not listed; Marun Klasik not found.

- [ ] **Step 3: Add the font**

In `server/theme/fonts.ts`, append `'Fraunces'` to `HEADING_FONTS`:

```ts
export const HEADING_FONTS = ['Cormorant Garamond', 'Playfair Display', 'Marcellus', 'Great Vibes', 'Cinzel', 'Courgette', 'Fraunces'] as const
```

- [ ] **Step 4: Append the curated theme**

In `server/theme/curated-themes.ts`, append to `CURATED_THEMES`:

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

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run tests/theme/fonts.test.ts tests/theme/curated-themes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/theme/fonts.ts server/theme/curated-themes.ts tests/theme/fonts.test.ts tests/theme/curated-themes.test.ts
git commit -m "feat: add Fraunces font + Marun Klasik curated theme"
```

---

### Task 2: Pack group A (hero, opening, member, closing)

**Files:**
- Create: `app/components/invitation/themes/maroon/{HeroSection,OpeningSection,MemberSection,ClosingSection}.vue`
- Test: `tests/components/maroon.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/maroon.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/themes/maroon/HeroSection.vue'
import Member from '../../app/components/invitation/themes/maroon/MemberSection.vue'
import Closing from '../../app/components/invitation/themes/maroon/ClosingSection.vue'

describe('maroon group A', () => {
  it('hero renders couple name', () => {
    const w = mount(Hero, { props: { content: { title: 'Pernikahan', coupleName: 'Putu & Kadek', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', backgroundImage: { mediaId: '', url: '' } } } })
    expect(w.text()).toContain('Putu & Kadek')
  })
  it('member renders participant + parents', () => {
    const w = mount(Member, { props: { content: { members: [{ parents: 'Bpk X', childOrder: 'Anak ke-1', peoples: [{ name: 'Putu', instagram: '', photo: { mediaId: '', url: '' } }] }] } } })
    expect(w.text()).toContain('Putu')
    expect(w.text()).toContain('Bpk X')
  })
  it('closing renders without crashing on empty', () => {
    const w = mount(Closing, { props: { content: { greeting: '', body: '' } } })
    expect(w.find('section').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: `HeroSection.vue`**

Copy base `sections/HeroSection.vue` `<script setup>` verbatim (imports `formatDate`; props title/coupleName/date/dateFormat/backgroundImage). Template:

```vue
<template>
  <section class="relative overflow-hidden px-6 py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img v-if="content.backgroundImage?.url" :src="content.backgroundImage.url" alt="" class="absolute inset-0 h-full w-full object-cover opacity-25" loading="lazy" />
    <div class="relative z-10">
      <p v-if="content.title" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ content.title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
      <div class="flex justify-center" style="color: var(--color-accent)">
        <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true"><line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" /><circle cx="58" cy="8" r="1.5" fill="currentColor" /><path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" /><circle cx="74" cy="8" r="1.5" fill="currentColor" /><line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" /></svg>
      </div>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
</template>
```

- [ ] **Step 4: `OpeningSection.vue`**

Copy base `<script setup>` (props greeting/body). Template:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-4 max-w-xl whitespace-pre-line">{{ content.body }}</p>
    <div class="mt-8 flex justify-center" style="color: var(--color-accent)">
      <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true"><line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" /><circle cx="58" cy="8" r="1.5" fill="currentColor" /><path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" /><circle cx="74" cy="8" r="1.5" fill="currentColor" /><line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" /></svg>
    </div>
  </section>
</template>
```

- [ ] **Step 5: `MemberSection.vue`**

Copy base `sections/MemberSection.vue` `<script setup>` (types Person/Member, props members). Template:

```vue
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(g, gi) in content.members" :key="gi" class="mx-auto mb-12 max-w-xl text-center last:mb-0">
      <p v-if="g.childOrder" class="text-sm uppercase tracking-[0.25em]" style="color: var(--color-accent)">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mt-2 mb-6 whitespace-pre-line text-sm">{{ g.parents }}</p>
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" style="border: 2px solid var(--color-accent)" loading="lazy" />
          <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 6: `ClosingSection.vue`**

Copy base `<script setup>` (props greeting/body). Template:

```vue
<template>
  <section class="px-6 py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 v-if="content.greeting" class="text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-3 max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: PASS (3).

- [ ] **Step 8: Commit**

```bash
git add app/components/invitation/themes/maroon/HeroSection.vue app/components/invitation/themes/maroon/OpeningSection.vue app/components/invitation/themes/maroon/MemberSection.vue app/components/invitation/themes/maroon/ClosingSection.vue tests/components/maroon.test.ts
git commit -m "feat: maroon pack — hero/opening/member/closing"
```

---

### Task 3: Pack group B (event, countdown, gallery)

**Files:**
- Create: `app/components/invitation/themes/maroon/{EventSection,CountdownSection,GallerySection}.vue`
- Test: extend `tests/components/maroon.test.ts`

- [ ] **Step 1: Add failing tests** (imports at top of `maroon.test.ts`):

```ts
import Event from '../../app/components/invitation/themes/maroon/EventSection.vue'
import Gallery from '../../app/components/invitation/themes/maroon/GallerySection.vue'

describe('maroon group B', () => {
  it('event renders name + maps link', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '10:00', timeEnd: '12:00', venue: 'Bali', mapsUrl: 'https://maps.google.com/x' }] } } })
    expect(w.text()).toContain('Resepsi')
    expect(w.html()).toContain('https://maps.google.com/x')
  })
  it('gallery renders a GalleryCarousel and title', () => {
    const w = mount(Gallery, { props: { content: { title: 'Galeri', items: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }] } } })
    expect(w.findComponent({ name: 'GalleryCarousel' }).exists()).toBe(true)
    expect(w.text()).toContain('Galeri')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: FAIL — Event/Gallery not found.

- [ ] **Step 3: `EventSection.vue`**

Copy base `sections/EventSection.vue` `<script setup>` (imports formatDate; props events[]). Template:

```vue
<template>
  <section class="space-y-8 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md p-6 text-center" style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)">
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p v-if="e.date" class="mt-3">{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart" class="mt-1">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener noreferrer" class="mt-4 inline-block px-5 py-2 text-sm" style="background: var(--color-primary); color: var(--color-bg); border-radius: var(--radius-md)">Lihat Peta</a>
    </div>
  </section>
</template>
```

- [ ] **Step 4: `CountdownSection.vue`**

Copy base `sections/CountdownSection.vue` `<script setup>` **verbatim** (timer + `units`/`remain` logic — read the base to learn the exact exposed shape). Reproduce its block as cream cards with gold borders + maroon numerals. Mirror the base template's bindings exactly inside:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="mb-6 text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Menuju Hari Bahagia</h2>
    <!-- reproduce the base's countdown unit loop here, each unit box: -->
    <!-- class="min-w-16 px-3 py-4" style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)" -->
    <!-- the number in style="color: var(--color-primary)", the label uppercase tracking-widest -->
  </section>
</template>
```

Use the base's actual unit data (e.g. its `units` array of `[label, key]` + `remain.d/h/m/s`, or whatever names the base exposes) — do not invent new state; only restyle. Keep the timer/`onMounted`/`onUnmounted` logic from the copied script untouched.

- [ ] **Step 5: `GallerySection.vue`**

Copy base `sections/GallerySection.vue` `<script setup>` (props `{ title?, items }`, computed `renderable`), and add the carousel import. Template (mobile carousel + gold-framed desktop grid + title):

```vue
<template>
  <section class="px-3 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <h2 v-if="content.title" class="mb-6 text-center text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div data-grid class="mx-auto hidden max-w-3xl gap-2 md:grid md:grid-cols-3">
      <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="h-40 w-full object-cover" style="border: 1px solid var(--color-accent); border-radius: var(--radius-md)" loading="lazy" />
    </div>
  </section>
</template>
```

The `<script setup>` must include `import GalleryCarousel from '../../GalleryCarousel.vue'` (in addition to the copied base script — the base gallery already imports it from `../GalleryCarousel.vue`; adjust the relative path to `../../GalleryCarousel.vue` for the `themes/maroon/` location).

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: PASS (groups A + B).

- [ ] **Step 7: Commit**

```bash
git add app/components/invitation/themes/maroon/EventSection.vue app/components/invitation/themes/maroon/CountdownSection.vue app/components/invitation/themes/maroon/GallerySection.vue tests/components/maroon.test.ts
git commit -m "feat: maroon pack — event/countdown/gallery"
```

---

### Task 4: Pack group C (rsvp, guestbook, info, footer)

**Files:**
- Create: `app/components/invitation/themes/maroon/{RsvpSection,GuestbookSection,InfoSection,FooterSection}.vue`
- Test: extend `tests/components/maroon.test.ts`

- [ ] **Step 1: Add failing tests** (imports at top):

```ts
import Info from '../../app/components/invitation/themes/maroon/InfoSection.vue'
import Footer from '../../app/components/invitation/themes/maroon/FooterSection.vue'

describe('maroon group C', () => {
  it('info renders phone', () => {
    const w = mount(Info, { props: { content: { phone: '0812', socials: [{ label: 'Instagram', url: 'https://instagram.com/x' }] } } })
    expect(w.text()).toContain('0812')
  })
  it('footer renders its text', () => {
    const w = mount(Footer, { props: { content: { text: '<b>Terima kasih</b>' } } })
    expect(w.find('b').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: FAIL — Info/Footer not found.

- [ ] **Step 3: `RsvpSection.vue`**

Copy base `sections/RsvpSection.vue` `<script setup>` **verbatim** (uses `useRsvpForm`: name/attendance/message/submitting/done/error/submit). Read the base template; reproduce its form inside `<section class="px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">`: title `<h2>` with `font-family: var(--font-heading); color: var(--color-primary)`; inputs `style="border: 1px solid var(--color-accent); border-radius: var(--radius-md)"`; submit button `style="background: var(--color-primary); color: var(--color-bg)"`. Preserve every v-model/handler/state exactly.

- [ ] **Step 4: `GuestbookSection.vue`**

Copy base `sections/GuestbookSection.vue` `<script setup>` verbatim (inject `'guestbook'` + `label()`). Reproduce the entries list inside the cream wrapper; each bubble `style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)"`. Keep the v-for + `label()` exactly.

- [ ] **Step 5: `InfoSection.vue`**

Copy base `<script setup>` (props phone/socials). Template:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Info Lebih Lanjut</h2>
    <p v-if="content.phone" class="mt-2">{{ content.phone }}</p>
    <div class="mt-4 flex justify-center gap-4">
      <a v-for="(s, i) in content.socials" :key="i" :href="s.url" target="_blank" rel="noopener noreferrer" class="text-sm" style="color: var(--color-accent)">{{ s.label }}</a>
    </div>
  </section>
</template>
```

- [ ] **Step 6: `FooterSection.vue`**

Copy base `sections/FooterSection.vue` `<script setup>` (props text; renders rich-text via `v-html` with the `'Made with Lovree'` fallback). Template:

```vue
<template>
  <footer class="px-6 py-12 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left" style="background: var(--color-primary); color: var(--color-bg)">
    <div v-if="content.text" v-html="content.text" />
    <template v-else>Made with Lovree</template>
  </footer>
</template>
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: PASS (groups A–C).

- [ ] **Step 8: Commit**

```bash
git add app/components/invitation/themes/maroon/RsvpSection.vue app/components/invitation/themes/maroon/GuestbookSection.vue app/components/invitation/themes/maroon/InfoSection.vue app/components/invitation/themes/maroon/FooterSection.vue tests/components/maroon.test.ts
git commit -m "feat: maroon pack — rsvp/guestbook/info/footer"
```

---

### Task 5: Pack cohesive group (couple, quote, love_gift, custom, video, hero_slideshow)

**Files:**
- Create: `app/components/invitation/themes/maroon/{CoupleSection,QuoteSection,LoveGiftSection,CustomSection,VideoSection,HeroSlideshowSection}.vue`
- Test: extend `tests/components/maroon.test.ts`

- [ ] **Step 1: Add failing tests** (imports at top):

```ts
import Couple from '../../app/components/invitation/themes/maroon/CoupleSection.vue'
import Quote from '../../app/components/invitation/themes/maroon/QuoteSection.vue'
import HeroSlideshow from '../../app/components/invitation/themes/maroon/HeroSlideshowSection.vue'

describe('maroon cohesive group', () => {
  it('couple renders a person name', () => {
    const w = mount(Couple, { props: { content: { people: [{ name: 'Putu', parents: '', childOrder: '', address: '', instagram: '', photo: { mediaId: '', url: '' } }] } } })
    expect(w.text()).toContain('Putu')
  })
  it('quote renders text', () => {
    const w = mount(Quote, { props: { content: { text: 'Cinta', source: 'X' } } })
    expect(w.text()).toContain('Cinta')
  })
  it('hero_slideshow renders couple name + a slide image', () => {
    const w = mount(HeroSlideshow, { props: { content: { title: 'T', coupleName: 'Putu & Kadek', date: '', dateFormat: 'DD MMMM YYYY', images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }] } } })
    expect(w.text()).toContain('Putu & Kadek')
    expect(w.find('img').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: FAIL — Couple/Quote/HeroSlideshow not found.

- [ ] **Step 3: `CoupleSection.vue`**

Copy base `<script setup>` (types + props people). Template:

```vue
<template>
  <section class="space-y-10 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(p, i) in content.people" :key="i" class="text-center">
      <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" style="border: 2px solid var(--color-accent)" loading="lazy" />
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
      <p v-if="p.childOrder" class="mt-1">{{ p.childOrder }}</p>
      <p v-if="p.parents" class="mt-1 whitespace-pre-line">{{ p.parents }}</p>
      <p v-if="p.address" class="mt-1 text-sm">{{ p.address }}</p>
      <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
    </div>
  </section>
</template>
```

- [ ] **Step 4: `QuoteSection.vue`**

Copy base `<script setup>` (props text/source). Template:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <blockquote class="mx-auto max-w-xl text-lg italic" style="font-family: var(--font-heading); color: var(--color-primary)">"{{ content.text }}"</blockquote>
    <p v-if="content.source" class="mt-2 text-sm" style="color: var(--color-accent)">— {{ content.source }}</p>
  </section>
</template>
```

- [ ] **Step 5: `LoveGiftSection.vue`**

Copy base `sections/LoveGiftSection.vue` `<script setup>` (props note/banks). Reproduce its bank-card list inside `<section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">`; heading "Love Gift" maroon Fraunces; each bank card `style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)"`. Keep the v-for over `content.banks` + fields bank/number/holder exactly.

- [ ] **Step 6: `CustomSection.vue`**

Copy base `sections/CustomSection.vue` `<script setup>` verbatim (computed `rows`). Reproduce its markup inside the cream wrapper, title maroon Fraunces; keep the v-for over `rows` + label/value bindings exactly.

- [ ] **Step 7: `VideoSection.vue`**

Copy base `sections/VideoSection.vue` `<script setup>` verbatim (computed `renderable`, `isValid`). Reproduce its YouTube embeds inside `<section class="space-y-4 px-6 py-14" style="background: var(--color-bg)">`; keep the v-for over `renderable` + embed markup exactly.

- [ ] **Step 8: `HeroSlideshowSection.vue`**

Copy base `sections/HeroSlideshowSection.vue` `<script setup>` verbatim (timer/`idx`/`renderable`). Reproduce its stacked-image fade inside the cream/maroon surface; overlay `coupleName` in Fraunces maroon, date, title. Keep the `renderable` loop, the `:class` opacity binding on `idx`, and `formatDate(content.date, content.dateFormat)` exactly.

- [ ] **Step 9: Run to verify it passes**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: PASS (all groups).

- [ ] **Step 10: Commit**

```bash
git add app/components/invitation/themes/maroon/CoupleSection.vue app/components/invitation/themes/maroon/QuoteSection.vue app/components/invitation/themes/maroon/LoveGiftSection.vue app/components/invitation/themes/maroon/CustomSection.vue app/components/invitation/themes/maroon/VideoSection.vue app/components/invitation/themes/maroon/HeroSlideshowSection.vue tests/components/maroon.test.ts
git commit -m "feat: maroon pack — couple/quote/love_gift/custom/video/hero_slideshow"
```

---

### Task 6: Maroon cover modal

**Files:**
- Create: `app/components/invitation/themes/maroon/CoverModal.vue`
- Test: extend `tests/components/maroon.test.ts`

- [ ] **Step 1: Add failing test** (import at top):

```ts
import Cover from '../../app/components/invitation/themes/maroon/CoverModal.vue'

describe('maroon cover', () => {
  it('renders couple + guest name and emits open', async () => {
    const w = mount(Cover, { props: { title: 'Pernikahan', coupleName: 'Putu & Kadek', guestName: 'Budi' } })
    expect(w.text()).toContain('Putu & Kadek')
    expect(w.text()).toContain('Budi')
    await w.find('button').trigger('click')
    expect(w.emitted('open')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: FAIL — Cover not found.

- [ ] **Step 3: Implement `CoverModal.vue`**

```vue
<script setup lang="ts">
defineOptions({ name: 'MaroonCover' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-hidden px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <svg class="pointer-events-none absolute left-3 top-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <svg class="pointer-events-none absolute right-3 top-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent); transform: scaleX(-1)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <svg class="pointer-events-none absolute bottom-3 left-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent); transform: scaleY(-1)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <svg class="pointer-events-none absolute bottom-3 right-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent); transform: scale(-1,-1)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <div class="relative z-10">
      <p class="text-xs uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <p class="mt-6 text-sm">Kepada Yth.</p>
      <p class="text-lg">{{ guestName }}</p>
      <button type="button" class="mt-8 px-8 py-3 text-sm uppercase tracking-[0.2em]" style="background: var(--color-primary); color: var(--color-bg); border-radius: var(--radius-md)" @click="$emit('open')">Buka Undangan</button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/maroon.test.ts`
Expected: PASS (all maroon tests incl. cover).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/themes/maroon/CoverModal.vue tests/components/maroon.test.ts
git commit -m "feat: maroon cover modal"
```

---

### Task 7: Register the pack + cover + resolution tests

**Files:**
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/theme-packs.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/components/theme-packs.test.ts` (already `// @vitest-environment nuxt`):

```ts
  it('maroon overrides every section type (full pack)', () => {
    for (const type of Object.keys(sectionComponents)) {
      const c = resolveSectionComponent('maroon', type)
      expect(c, `maroon missing ${type}`).toBeTruthy()
      expect(c).not.toBe(sectionComponents[type])
    }
  })
  it('resolveCover returns the maroon cover', () => {
    expect(resolveCover('maroon')).not.toBe(CoverModal)
    expect(resolveCover('maroon')).toBeTruthy()
  })
```

(Place the first inside the `resolveSectionComponent` describe, the second inside the `resolveCover` describe — both helpers/imports already exist in the file.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/theme-packs.test.ts`
Expected: FAIL — `maroon` not in `packs`/`covers`.

- [ ] **Step 3: Register**

In `app/components/invitation/themePacks.ts`:
- Add 17 section imports `import MaroonHero from './themes/maroon/HeroSection.vue'` … (Hero, HeroSlideshow, Opening, Couple, Member, Event, Countdown, Quote, LoveGift, Gallery, Video, Closing, Info, Rsvp, Guestbook, Footer, Custom) + `import MaroonCover from './themes/maroon/CoverModal.vue'`.
- Add a `maroon` entry to `packs` with all 17 mappings (mirror the `elegant`/`dark_prada` key set):

```ts
  maroon: { hero: MaroonHero, hero_slideshow: MaroonHeroSlideshow, opening: MaroonOpening, couple: MaroonCouple, member: MaroonMember, event: MaroonEvent, countdown: MaroonCountdown, quote: MaroonQuote, love_gift: MaroonLoveGift, gallery: MaroonGallery, video: MaroonVideo, closing: MaroonClosing, info: MaroonInfo, rsvp: MaroonRsvp, guestbook: MaroonGuestbook, footer: MaroonFooter, custom: MaroonCustom },
```

- Add `maroon: MaroonCover` to the `covers` map.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/theme-packs.test.ts`
Expected: PASS (elegant + dark_prada invariants + the new maroon ones + resolveCover).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/themePacks.ts tests/components/theme-packs.test.ts
git commit -m "feat: register maroon pack + cover (all 17 sections)"
```

---

### Task 8: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + fonts/theme + maroon component tests + pack/cover resolution).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: "Marun Klasik" curated theme + Fraunces font, full 17-section maroon pack + cover, registered + resolution-tested, inline-SVG gold ornaments (no assets). Flag the human prerequisite: run `npm run db:reset` so the theme appears in the picker, then visually verify a published invitation in Marun Klasik (cream + maroon + gold). Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3.1 font → Task 1; §3.2 curated → Task 1; §5 pack components → Tasks 2–5; §6 cover → Task 6; §5 registration → Task 7; §4/§6 visual → Tasks 2–6 templates; §7 testing → Tasks 1–7 + Task 8 gate. All covered.
- **Pack covers all 17:** A(4)+B(3)+C(4)+cohesive(6) = 17 = every `SECTION_TYPES`; Task 7's resolution test enforces it; cover via `covers.maroon`.
- **Logic preserved:** every component copies the base `<script setup>` verbatim (countdown timer, rsvp `useRsvpForm`, guestbook inject, slideshow timer, gallery/video computeds); only templates change.
- **Asset-free:** ornaments are inline SVG (gold via `var(--color-accent)`), so `maroon.test.ts` runs under plain happy-dom (no nuxt env). `theme-packs.test.ts` already has the pragma (it imports dark_prada static-asset components).
- **Gallery:** maroon `GallerySection` reuses `GalleryCarousel` (import path `../../GalleryCarousel.vue`) + `data-grid` desktop grid + optional title, consistent with the shipped gallery split.
- **Font:** `Fraunces` added to `HEADING_FONTS` in the same task as the theme (the curated-themes validity test requires it to be allow-listed).

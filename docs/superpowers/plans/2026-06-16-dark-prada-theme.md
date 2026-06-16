# Dark Prada Theme (component pack) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dark, ornament-rich "Dark Prada" theme — a `CuratedTheme` (dark palette + Courgette/DM Sans) plus a full `dark_prada` component pack overriding all 17 section types, using the source project's own SVG assets.

**Architecture:** Tokens + fonts in the registry/allow-list; assets fetched into `public/`; a per-section Vue pack under `themes/dark_prada/` registered in `themePacks`. Each pack component reuses its base component's `<script setup>` (logic/props) verbatim and swaps the `<template>` for the dark styling; all read CSS vars so the token cascade + user overrides keep working.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind, Vitest + @vue/test-utils (happy-dom), curl for assets.

**Spec:** `docs/superpowers/specs/2026-06-16-dark-prada-theme-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Conventions for every pack component task:**
- Read the base component at `app/components/invitation/sections/<X>Section.vue` first.
- Create `app/components/invitation/themes/dark_prada/<X>Section.vue`: **copy its `<script setup>` block verbatim** (same imports, props, logic — this preserves countdown timer, rsvp form, guestbook inject, etc.), then replace ONLY the `<template>` with the dark version given in the task.
- Do NOT register anything in `themePacks` until Task 7 (the "overrides every section" test only passes once all 17 exist).
- Dark visual language: outer `<section>` uses `style="background: var(--color-bg)"` with light text; headings use `style="font-family: var(--font-heading); color: var(--color-primary)"`; gold = `var(--color-primary)`; assets referenced by absolute path `/assets/dark-prada/...`.

---

## File Structure

- `server/theme/fonts.ts` (modify) — add `Courgette` (heading) + `DM Sans` (body).
- `server/theme/curated-themes.ts` (modify) — append the `Dark Prada` curated theme (`key: 'dark_prada'`).
- `public/assets/dark-prada/**` (create) — fetched SVG ornaments/dividers/icons + `bg.png`.
- `app/components/invitation/themes/dark_prada/<17 components>.vue` (create).
- `app/components/invitation/themePacks.ts` (modify) — register the `dark_prada` pack.
- Tests: `tests/theme/fonts.test.ts` (modify), `tests/theme/curated-themes.test.ts` (modify), `tests/components/theme-packs.test.ts` (modify), `tests/components/dark-prada.test.ts` (create).

---

### Task 1: Fonts allow-list + curated theme

**Files:**
- Modify: `server/theme/fonts.ts`, `server/theme/curated-themes.ts`
- Test: `tests/theme/fonts.test.ts`, `tests/theme/curated-themes.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/theme/fonts.test.ts`, add inside the `describe('curated fonts', …)`:

```ts
  it('includes Courgette (heading) and DM Sans (body)', () => {
    expect(HEADING_FONTS as readonly string[]).toContain('Courgette')
    expect(BODY_FONTS as readonly string[]).toContain('DM Sans')
    const href = googleFontsHref()
    expect(href).toContain('family=Courgette')
    expect(href).toContain('family=DM+Sans')
  })
```

In `tests/theme/curated-themes.test.ts`, add inside `describe('CURATED_THEMES', …)`:

```ts
  it('includes Dark Prada with the dark_prada pack key', () => {
    const t = CURATED_THEMES.find((x) => x.name === 'Dark Prada')
    expect(t).toBeTruthy()
    expect(t!.key).toBe('dark_prada')
    expect(t!.tokens.color.bg).toBe('#1b1a17')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/theme/fonts.test.ts tests/theme/curated-themes.test.ts`
Expected: FAIL — Courgette/DM Sans not listed; Dark Prada not found. (The existing "every theme has allow-listed fonts" test will also fail once the theme is added before the fonts — so add both in the same task.)

- [ ] **Step 3: Add the fonts**

In `server/theme/fonts.ts`:

```ts
export const HEADING_FONTS = ['Cormorant Garamond', 'Playfair Display', 'Marcellus', 'Great Vibes', 'Cinzel', 'Courgette'] as const
export const BODY_FONTS = ['Poppins', 'Lora', 'Nunito Sans', 'EB Garamond', 'DM Sans'] as const
```

- [ ] **Step 4: Append the curated theme**

In `server/theme/curated-themes.ts`, append to the `CURATED_THEMES` array (after `Elegant Noir`, keeping `Radiant Love` first):

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

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/theme/fonts.test.ts tests/theme/curated-themes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/theme/fonts.ts server/theme/curated-themes.ts tests/theme/fonts.test.ts tests/theme/curated-themes.test.ts
git commit -m "feat: add Courgette/DM Sans fonts + Dark Prada curated theme"
```

---

### Task 2: Fetch assets into public/

**Files:**
- Create: `public/assets/dark-prada/**`

(No unit test — verified by file existence + the components that reference them.)

- [ ] **Step 1: Fetch the assets**

```bash
cd /Users/mangtri/Web/lovree-v3
mkdir -p public/assets/dark-prada/ornament public/assets/dark-prada/divider public/assets/dark-prada/icon
base=https://lovree.com/assets/dark-prada
for f in hero-tl hero-tr hero-bl hero-br tl tr ornament-1 ornament-5 frame; do
  curl -fsSL "$base/ornament/$f.svg" -o "public/assets/dark-prada/ornament/$f.svg" || echo "MISS ornament/$f"
done
for f in cover flower dark1 dark2; do
  curl -fsSL "$base/divider/$f.svg" -o "public/assets/dark-prada/divider/$f.svg" || echo "MISS divider/$f"
done
for f in date time place map calender-check whatsapp facebook instagram; do
  curl -fsSL "$base/icon/$f.svg" -o "public/assets/dark-prada/icon/$f.svg" || echo "MISS icon/$f"
done
curl -fsSL "https://lovree.com/build/assets/bg-2346d62b.png" -o "public/assets/dark-prada/bg.png" || echo "MISS bg.png"
```

- [ ] **Step 2: Verify**

Run: `find public/assets/dark-prada -type f | sort && echo "---" && file public/assets/dark-prada/ornament/hero-tl.svg public/assets/dark-prada/bg.png`
Expected: ~21 SVGs + `bg.png`; the `file` check shows "SVG" / "PNG image". Any `MISS` lines from Step 1 → note them; a missing decorative file is acceptable (component degrades to no-ornament) but try a second time before accepting.

- [ ] **Step 3: Commit**

```bash
git add public/assets/dark-prada
git commit -m "chore: vendor Dark Prada SVG ornaments/icons + bg texture"
```

---

### Task 3: Pack components — faithful group A (hero, opening, member, closing)

**Files:**
- Create: `app/components/invitation/themes/dark_prada/{HeroSection,OpeningSection,MemberSection,ClosingSection}.vue`
- Test: `tests/components/dark-prada.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/dark-prada.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/themes/dark_prada/HeroSection.vue'
import Member from '../../app/components/invitation/themes/dark_prada/MemberSection.vue'
import Closing from '../../app/components/invitation/themes/dark_prada/ClosingSection.vue'

describe('dark_prada group A', () => {
  it('hero renders title + couple name', () => {
    const w = mount(Hero, { props: { content: { title: 'Mepandes', coupleName: 'Putu & Kadek', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', backgroundImage: { mediaId: '', url: '' } } } })
    expect(w.text()).toContain('Putu & Kadek')
  })
  it('member renders participants + parents', () => {
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

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `HeroSection.vue`**

Read `app/components/invitation/sections/HeroSection.vue` and copy its `<script setup>` verbatim (it imports `formatDate`, props include `title, coupleName, date, dateFormat, backgroundImage`). Replace the template with:

```vue
<template>
  <section class="relative overflow-hidden px-6 py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img v-if="content.backgroundImage?.url" :src="content.backgroundImage.url" alt="" class="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />
    <img src="/assets/dark-prada/ornament/hero-tl.svg" alt="" class="pointer-events-none absolute left-0 top-0 w-24" />
    <img src="/assets/dark-prada/ornament/hero-tr.svg" alt="" class="pointer-events-none absolute right-0 top-0 w-24" />
    <img src="/assets/dark-prada/ornament/hero-bl.svg" alt="" class="pointer-events-none absolute bottom-0 left-0 w-24" />
    <img src="/assets/dark-prada/ornament/hero-br.svg" alt="" class="pointer-events-none absolute bottom-0 right-0 w-24" />
    <div class="relative z-10">
      <p v-if="content.title" class="tracking-[0.3em] uppercase text-sm">{{ content.title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Create `OpeningSection.vue`**

Copy `sections/OpeningSection.vue`'s `<script setup>` (props `{ greeting, body }`). Template:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-4 max-w-xl whitespace-pre-line">{{ content.body }}</p>
    <img src="/assets/dark-prada/divider/flower.svg" alt="" class="mx-auto mt-8 h-8" />
  </section>
</template>
```

- [ ] **Step 5: Create `MemberSection.vue`**

Copy `sections/MemberSection.vue`'s `<script setup>` (types `Person`/`Member`, props `{ members }`). Template:

```vue
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(g, gi) in content.members" :key="gi" class="mx-auto mb-12 max-w-xl text-center last:mb-0">
      <p v-if="g.childOrder" class="text-sm uppercase tracking-[0.25em]" style="color: var(--color-primary)">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mt-2 mb-6 whitespace-pre-line text-sm">{{ g.parents }}</p>
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <div class="relative mx-auto mb-3 h-32 w-32">
            <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="h-32 w-32 rounded-full object-cover" loading="lazy" />
            <img src="/assets/dark-prada/ornament/frame.svg" alt="" class="pointer-events-none absolute inset-0 h-full w-full scale-125" />
          </div>
          <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
      <img src="/assets/dark-prada/divider/flower.svg" alt="" class="mx-auto mt-8 h-8" />
    </div>
  </section>
</template>
```

- [ ] **Step 6: Create `ClosingSection.vue`**

Copy `sections/ClosingSection.vue`'s `<script setup>` (props `{ greeting, body }`). Template:

```vue
<template>
  <section class="px-6 py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img src="/assets/dark-prada/divider/dark1.svg" alt="" class="mx-auto mb-6 h-6" />
    <h2 v-if="content.greeting" class="text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-3 max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add app/components/invitation/themes/dark_prada/HeroSection.vue app/components/invitation/themes/dark_prada/OpeningSection.vue app/components/invitation/themes/dark_prada/MemberSection.vue app/components/invitation/themes/dark_prada/ClosingSection.vue tests/components/dark-prada.test.ts
git commit -m "feat: dark_prada pack — hero/opening/member/closing"
```

---

### Task 4: Pack components — faithful group B (event, countdown, gallery)

**Files:**
- Create: `app/components/invitation/themes/dark_prada/{EventSection,CountdownSection,GallerySection}.vue`
- Test: extend `tests/components/dark-prada.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/components/dark-prada.test.ts`:

```ts
import Event from '../../app/components/invitation/themes/dark_prada/EventSection.vue'
import Gallery from '../../app/components/invitation/themes/dark_prada/GallerySection.vue'

describe('dark_prada group B', () => {
  it('event renders an event name + maps link', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Mepandes', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '10:00', timeEnd: '12:00', venue: 'Bali', mapsUrl: 'https://maps.google.com/x' }] } } })
    expect(w.text()).toContain('Mepandes')
    expect(w.html()).toContain('https://maps.google.com/x')
  })
  it('gallery renders only items with a url', () => {
    const w = mount(Gallery, { props: { content: { items: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, { mediaId: '', url: '' }] } } })
    expect(w.findAll('img').length).toBe(1)
  })
})
```

(Import lines go at the top with the others.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: FAIL — Event/Gallery modules not found.

- [ ] **Step 3: Create `EventSection.vue`**

Copy `sections/EventSection.vue`'s `<script setup>` (imports `formatDate`; props are `{ events: [...] }`). Template:

```vue
<template>
  <section class="space-y-8 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md rounded-lg p-6 text-center" style="border: 1px solid var(--color-primary)">
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p v-if="e.date" class="mt-3 flex items-center justify-center gap-2"><img src="/assets/dark-prada/icon/date.svg" alt="" class="h-4 w-4" />{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart" class="mt-1 flex items-center justify-center gap-2"><img src="/assets/dark-prada/icon/time.svg" alt="" class="h-4 w-4" />{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1 flex items-center justify-center gap-2"><img src="/assets/dark-prada/icon/place.svg" alt="" class="h-4 w-4" />{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center gap-2 rounded border px-4 py-2 text-sm" style="border-color: var(--color-primary); color: var(--color-primary)"><img src="/assets/dark-prada/icon/map.svg" alt="" class="h-4 w-4" />Lihat Peta</a>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Create `CountdownSection.vue`**

Copy `sections/CountdownSection.vue`'s `<script setup>` **verbatim** (it has the timer logic + computed `days/hours/minutes/seconds` — keep exactly; inspect the base for the exact exposed names and reuse them). Replace only the template with a dark version. Read the base template to get the exact binding names; mirror them in this structure:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="mb-6 text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Menuju Hari Bahagia</h2>
    <div class="flex justify-center gap-4">
      <div v-for="u in units" :key="u.label" class="min-w-16 rounded-lg px-3 py-4" style="border: 1px solid var(--color-primary)">
        <div class="text-3xl" style="color: var(--color-primary)">{{ u.value }}</div>
        <div class="text-xs uppercase tracking-widest">{{ u.label }}</div>
      </div>
    </div>
  </section>
</template>
```

If the base does not already expose a `units` array, add a computed in the copied script that maps the base's day/hour/minute/second refs to `units = [{ label: 'Hari', value: days }, { label: 'Jam', value: hours }, { label: 'Menit', value: minutes }, { label: 'Detik', value: seconds }]` using whatever the base named them. Do not change the timer logic.

- [ ] **Step 5: Create `GallerySection.vue`**

Copy `sections/GallerySection.vue`'s `<script setup>` (computed `renderable` = items with url). Template:

```vue
<template>
  <section class="px-3 py-14" style="background: var(--color-bg)">
    <div class="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
      <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="h-40 w-full rounded object-cover" style="border: 1px solid var(--color-primary)" loading="lazy" />
    </div>
  </section>
</template>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: PASS (group A + B).

- [ ] **Step 7: Commit**

```bash
git add app/components/invitation/themes/dark_prada/EventSection.vue app/components/invitation/themes/dark_prada/CountdownSection.vue app/components/invitation/themes/dark_prada/GallerySection.vue tests/components/dark-prada.test.ts
git commit -m "feat: dark_prada pack — event/countdown/gallery"
```

---

### Task 5: Pack components — faithful group C (rsvp, guestbook, info, footer)

**Files:**
- Create: `app/components/invitation/themes/dark_prada/{RsvpSection,GuestbookSection,InfoSection,FooterSection}.vue`
- Test: extend `tests/components/dark-prada.test.ts`

- [ ] **Step 1: Add failing tests**

Append (imports at top):

```ts
import Info from '../../app/components/invitation/themes/dark_prada/InfoSection.vue'
import Footer from '../../app/components/invitation/themes/dark_prada/FooterSection.vue'

describe('dark_prada group C', () => {
  it('info renders phone + social labels', () => {
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

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: FAIL — Info/Footer not found.

- [ ] **Step 3: Create `RsvpSection.vue`**

Copy `sections/RsvpSection.vue`'s `<script setup>` **verbatim** (it uses `useRsvpForm` — keep the composable + all bindings: `name, attendance, message, submitting, done, error, submit`). Read the base template for the exact form markup and reproduce it inside a dark wrapper: outer `<section class="px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">`, the title `<h2>` with `font-family: var(--font-heading); color: var(--color-primary)`, inputs with `style="background: var(--color-secondary); color: var(--color-text)"`, and the submit button `style="background: var(--color-primary)"`. Preserve every `v-model`, the attendance radios, the submit handler, and the done/error states exactly as the base has them — only the wrapper/colours change.

- [ ] **Step 4: Create `GuestbookSection.vue`**

Copy `sections/GuestbookSection.vue`'s `<script setup>` verbatim (it `inject`s `'guestbook'` and has the `label()` helper). Reproduce the base's list markup inside a dark wrapper; each entry bubble uses `style="background: var(--color-secondary); color: var(--color-text)"`. Keep the `v-for` over the injected entries and the `label()` usage exactly.

- [ ] **Step 5: Create `InfoSection.vue`**

Copy `sections/InfoSection.vue`'s `<script setup>` (props `{ phone, socials }`). Template:

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

- [ ] **Step 6: Create `FooterSection.vue`**

Copy `sections/FooterSection.vue`'s `<script setup>` (props `{ text }`; note the footer renders rich-text HTML via `v-html`). Template — keep the `v-html`/fallback behaviour, dark styling + social icons:

```vue
<template>
  <footer class="px-6 py-12 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left" style="background: var(--color-secondary); color: var(--color-text)">
    <div v-if="content.text" v-html="content.text" />
    <template v-else>Made with Lovree</template>
    <div class="mt-4 flex justify-center gap-4">
      <img src="/assets/dark-prada/icon/whatsapp.svg" alt="WhatsApp" class="h-5 w-5" />
      <img src="/assets/dark-prada/icon/facebook.svg" alt="Facebook" class="h-5 w-5" />
      <img src="/assets/dark-prada/icon/instagram.svg" alt="Instagram" class="h-5 w-5" />
    </div>
  </footer>
</template>
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: PASS (groups A–C).

- [ ] **Step 8: Commit**

```bash
git add app/components/invitation/themes/dark_prada/RsvpSection.vue app/components/invitation/themes/dark_prada/GuestbookSection.vue app/components/invitation/themes/dark_prada/InfoSection.vue app/components/invitation/themes/dark_prada/FooterSection.vue tests/components/dark-prada.test.ts
git commit -m "feat: dark_prada pack — rsvp/guestbook/info/footer"
```

---

### Task 6: Pack components — cohesive dark group (couple, quote, love_gift, custom, video, hero_slideshow)

**Files:**
- Create: `app/components/invitation/themes/dark_prada/{CoupleSection,QuoteSection,LoveGiftSection,CustomSection,VideoSection,HeroSlideshowSection}.vue`
- Test: extend `tests/components/dark-prada.test.ts`

These are not on the reference; give each the dark palette + gold heading. For each, copy the base `<script setup>` verbatim and wrap the base template in the dark surface, recolouring headings to `var(--color-primary)` and the section bg to `var(--color-bg)`.

- [ ] **Step 1: Add failing tests**

Append (imports at top):

```ts
import Couple from '../../app/components/invitation/themes/dark_prada/CoupleSection.vue'
import Quote from '../../app/components/invitation/themes/dark_prada/QuoteSection.vue'
import HeroSlideshow from '../../app/components/invitation/themes/dark_prada/HeroSlideshowSection.vue'

describe('dark_prada cohesive group', () => {
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

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: FAIL — Couple/Quote/HeroSlideshow not found.

- [ ] **Step 3: Create `CoupleSection.vue`**

Copy `sections/CoupleSection.vue`'s `<script setup>` (types + props `{ people }`). Template:

```vue
<template>
  <section class="space-y-10 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(p, i) in content.people" :key="i" class="text-center">
      <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" loading="lazy" />
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
      <p v-if="p.childOrder" class="mt-1">{{ p.childOrder }}</p>
      <p v-if="p.parents" class="mt-1 whitespace-pre-line">{{ p.parents }}</p>
      <p v-if="p.address" class="mt-1 text-sm">{{ p.address }}</p>
      <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Create `QuoteSection.vue`**

Copy `sections/QuoteSection.vue`'s `<script setup>` (props `{ text, source }`). Template:

```vue
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <blockquote class="mx-auto max-w-xl text-lg italic" style="font-family: var(--font-heading); color: var(--color-primary)">"{{ content.text }}"</blockquote>
    <p v-if="content.source" class="mt-2 text-sm">— {{ content.source }}</p>
  </section>
</template>
```

- [ ] **Step 5: Create `LoveGiftSection.vue`**

Copy `sections/LoveGiftSection.vue`'s `<script setup>` (props `{ note, banks }`). Reproduce the base's bank-list markup inside `<section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">`, heading "Love Gift" with `font-family: var(--font-heading); color: var(--color-primary)`, and each bank card `style="background: var(--color-secondary)"`. Keep the `v-for` over `content.banks` and all fields (`bank`, `number`, `holder`) exactly.

- [ ] **Step 6: Create `CustomSection.vue`**

Copy `sections/CustomSection.vue`'s `<script setup>` verbatim (computed `rows`). Reproduce its base markup inside the dark surface (`background: var(--color-bg); color: var(--color-text)`), title with `color: var(--color-primary)`, keeping the `v-for` over `rows` and the `label`/`value` bindings.

- [ ] **Step 7: Create `VideoSection.vue`**

Copy `sections/VideoSection.vue`'s `<script setup>` verbatim (computed `renderable`, `isValid`). Reproduce its base iframe/embeds inside `<section class="space-y-4 px-6 py-14" style="background: var(--color-bg)">`, keeping the `v-for` over `renderable` and the YouTube embed markup exactly.

- [ ] **Step 8: Create `HeroSlideshowSection.vue`**

Copy `sections/HeroSlideshowSection.vue`'s `<script setup>` verbatim (timer/`idx`/`renderable` logic). Reproduce the base's stacked-image fade template inside the dark surface, overlaying the title/coupleName/date with `color: var(--color-primary)` heading. Keep the `renderable` loop, the `:class` opacity binding on `idx`, and the `formatDate(content.date, content.dateFormat)` usage exactly.

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run tests/components/dark-prada.test.ts`
Expected: PASS (all groups).

- [ ] **Step 10: Commit**

```bash
git add app/components/invitation/themes/dark_prada/CoupleSection.vue app/components/invitation/themes/dark_prada/QuoteSection.vue app/components/invitation/themes/dark_prada/LoveGiftSection.vue app/components/invitation/themes/dark_prada/CustomSection.vue app/components/invitation/themes/dark_prada/VideoSection.vue app/components/invitation/themes/dark_prada/HeroSlideshowSection.vue tests/components/dark-prada.test.ts
git commit -m "feat: dark_prada pack — couple/quote/love_gift/custom/video/hero_slideshow"
```

---

### Task 7: Register the pack + resolution test

**Files:**
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/theme-packs.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/components/theme-packs.test.ts`, add:

```ts
  it('dark_prada overrides every section type (full pack)', () => {
    for (const type of Object.keys(sectionComponents)) {
      const c = resolveSectionComponent('dark_prada', type)
      expect(c, `dark_prada missing ${type}`).toBeTruthy()
      expect(c).not.toBe(sectionComponents[type])
    }
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/theme-packs.test.ts`
Expected: FAIL — `dark_prada` not in `packs`, so `resolveSectionComponent` falls back to base (or null).

- [ ] **Step 3: Register the pack**

In `app/components/invitation/themePacks.ts`:
- Add 17 imports, e.g. `import DarkPradaHero from './themes/dark_prada/HeroSection.vue'` … one per section (Hero, HeroSlideshow, Opening, Couple, Member, Event, Countdown, Quote, LoveGift, Gallery, Video, Closing, Info, Rsvp, Guestbook, Footer, Custom).
- Add a `dark_prada` entry to the `packs` object with all 17 mappings, mirroring the `elegant` entry's keys:

```ts
  dark_prada: { hero: DarkPradaHero, hero_slideshow: DarkPradaHeroSlideshow, opening: DarkPradaOpening, couple: DarkPradaCouple, member: DarkPradaMember, event: DarkPradaEvent, countdown: DarkPradaCountdown, quote: DarkPradaQuote, love_gift: DarkPradaLoveGift, gallery: DarkPradaGallery, video: DarkPradaVideo, closing: DarkPradaClosing, info: DarkPradaInfo, rsvp: DarkPradaRsvp, guestbook: DarkPradaGuestbook, footer: DarkPradaFooter, custom: DarkPradaCustom },
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/theme-packs.test.ts`
Expected: PASS (existing elegant invariant + the new dark_prada one).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/themePacks.ts tests/components/theme-packs.test.ts
git commit -m "feat: register dark_prada pack (all 17 sections)"
```

---

### Task 8: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior 261 + fonts/theme + dark-prada component tests + pack resolution).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm Dark Prada complete: curated theme + Courgette/DM Sans fonts, vendored assets, full 17-section dark pack, registered + resolution-tested. Flag the human prerequisite: run `npm run db:seed:themes` (or `db:reset`) so the theme appears in the picker, then visually verify a published invitation rendered with Dark Prada (dark bg, gold ornaments). Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3.1 fonts → Task 1; §3.2 curated → Task 1; §4 assets → Task 2; §5 pack components → Tasks 3–6; §5 registration → Task 7; §6/§7 visual treatment → Tasks 3–6 templates; §8 testing → Tasks 1/3–7 + Task 8 gate. All covered.
- **Pack covers all 17:** groups A(4)+B(3)+C(4)+cohesive(6) = 17 = every `SECTION_TYPES` entry; Task 7's resolution test enforces it.
- **Logic preserved:** every component copies the base `<script setup>` verbatim (countdown timer, rsvp `useRsvpForm`, guestbook inject, slideshow timer, gallery/video computeds) — only templates change. No behavioural divergence.
- **Test sequencing:** the "dark_prada overrides every section" test is added only in Task 7 (after all 17 exist); component smoke tests in Tasks 3–6 import components directly and don't need registration. The curated-themes font-validity test forces the fonts.ts change to land with the theme in Task 1.
- **Assets:** absolute `/assets/dark-prada/...` paths; missing decorative SVG degrades to no-ornament (img with broken src), not a crash — acceptable per spec.
- **Seeding:** agent does not run `db:migrate`/`db:seed`; Task 8 flags it as the human prerequisite.

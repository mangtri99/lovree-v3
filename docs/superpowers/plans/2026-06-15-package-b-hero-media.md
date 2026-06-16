# Package B — Hero Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hero gains an optional background photo (text overlaid full-bleed); a new Hero Slideshow section auto-advances multiple photos behind the same overlaid text — in base and elegant packs.

**Architecture:** Reuse the `image` (ImageControl, `{mediaId,url}`) and `gallery` (GalleryControl, `{mediaId,url}[]`) field controls. `heroSchema` gains `backgroundImage`; a new `hero_slideshow` section type carries hero fields + `images`. Render variants overlay text on a full-bleed photo with a dark scrim; the slideshow auto-advances client-side.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Zod, Vitest + @vue/test-utils. No new deps, no migration.

**Branch:** `feat/phase-2b-media`.

**Grounding facts:**
- `heroSchema = z.object({ title, coupleName, date, dateFormat })`; hero `fields` has title/coupleName/date/dateFormat. Base `HeroSection.vue` + elegant `themes/elegant/HeroSection.vue` both `import { formatDate } from '~/utils/date-format'` and render title eyebrow + couple name + `formatDate(date, dateFormat)`.
- `galleryImages` (resilient `{mediaId,url}[]`) is already imported in `server/registry/sections.ts` (line 2) from `./field-types`.
- Field types `image` → ImageControl, `gallery` → GalleryControl, `dateformat` → DateFormatControl already exist in the `FieldType` union + FieldEditor map.
- `sectionComponents` (app/components/invitation/sectionComponents.ts) maps `hero: HeroSection, …`. `themePacks.ts` `packs.elegant` maps `hero: ElegantHero, …` (15 entries); `resolveSectionComponent(themeKey, type) = packs[themeKey]?.[type] ?? base[type] ?? null`. `tests/components/section-map-alignment.test.ts` enforces every `SECTION_TYPES` entry has a base component.
- ImageControl emits `{mediaId,url}`; GalleryControl manages `{mediaId,url}[]` with multi-upload + ↑/↓ reorder.

---

## File Structure

- Modify `server/registry/sections.ts` — `heroSchema.backgroundImage`, hero descriptor, `heroSlideshowSchema` + `hero_slideshow` entry.
- Modify base `sections/HeroSection.vue` + elegant `themes/elegant/HeroSection.vue` — background photo path.
- Create base `sections/HeroSlideshowSection.vue` + elegant `themes/elegant/HeroSlideshowSection.vue`; modify `sectionComponents.ts` + `themePacks.ts`.
- Tests: `tests/registry/sections.test.ts`, `tests/components/hero-media.test.ts`, `tests/components/hero-slideshow.test.ts`.

---

## Task 1: Registry — hero background + hero_slideshow

**Files:** Modify `server/registry/sections.ts`; Test `tests/registry/sections.test.ts`.

- [ ] **Step 1: Write the failing tests** (append to `tests/registry/sections.test.ts`):
```ts
describe('package B schema', () => {
  it('hero defaults backgroundImage to empty', () => {
    expect(validateContent('hero', {}).backgroundImage).toEqual({ mediaId: '', url: '' })
  })
  it('hero_slideshow defaults', () => {
    expect(validateContent('hero_slideshow', {})).toEqual({ title: '', coupleName: '', date: '', dateFormat: 'DD MMMM YYYY', images: [] })
  })
  it('hero_slideshow keeps valid images, drops malformed', () => {
    const out = validateContent('hero_slideshow', { images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, 'bogus'] })
    expect(out.images).toEqual([{ mediaId: 'm', url: 'https://cdn/a.jpg' }])
  })
})
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/registry/sections.test.ts -t "package B schema"`

- [ ] **Step 3: Implement** in `server/registry/sections.ts`:
1. `heroSchema`: add `backgroundImage: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' }),`
2. Hero `fields`: add `backgroundImage: { type: 'image' as const, label: 'Foto Background' },`
3. Add the slideshow schema near the hero schema:
```ts
const heroSlideshowSchema = z.object({
  title: z.string().default(''),
  coupleName: z.string().default(''),
  date: z.string().default(''),
  dateFormat: z.string().default('DD MMMM YYYY'),
  images: galleryImages,
})
```
4. Add a `hero_slideshow` registry entry (place it right after the `hero` entry):
```ts
  hero_slideshow: {
    schema: heroSlideshowSchema,
    label: 'Hero Slideshow',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      coupleName: { type: 'text' as const, label: 'Nama Pasangan' },
      date: { type: 'date' as const, label: 'Tanggal' },
      dateFormat: { type: 'dateformat' as const, label: 'Format Tanggal' },
      images: { type: 'gallery' as const, label: 'Foto' },
    },
  },
```

- [ ] **Step 4: Run registry + document suites** — `npx vitest run tests/registry tests/document`
Expected PASS. (Do NOT run the components suite: `section-map-alignment` will fail because `hero_slideshow` has no component yet — fixed in Task 3. Expected.)

- [ ] **Step 5: Commit**
```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: hero backgroundImage + hero_slideshow section in the registry"
```

---

## Task 2: Hero background render (base + elegant)

**Files:** Modify `app/components/invitation/sections/HeroSection.vue`, `app/components/invitation/themes/elegant/HeroSection.vue`; Test `tests/components/hero-media.test.ts`.

- [ ] **Step 1: Write the failing test** — create `tests/components/hero-media.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/sections/HeroSection.vue'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'

const base = { title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD MMMM YYYY' }

for (const [name, Comp] of [['base', Hero], ['elegant', ElegantHero]] as const) {
  describe(`Hero background (${name})`, () => {
    it('renders the background photo + text when set', () => {
      const w = mount(Comp, { props: { content: { ...base, backgroundImage: { mediaId: 'm', url: 'https://cdn/bg.jpg' } } } })
      expect(w.text()).toContain('W & D')
      expect(w.html()).toContain('https://cdn/bg.jpg')
    })
    it('renders text only (no bg image) when unset', () => {
      const w = mount(Comp, { props: { content: { ...base, backgroundImage: { mediaId: '', url: '' } } } })
      expect(w.text()).toContain('W & D')
      expect(w.html()).not.toContain('background-image')
    })
  })
}
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/components/hero-media.test.ts`

- [ ] **Step 3: Update base `HeroSection.vue`**:
```vue
<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; backgroundImage: { mediaId: string; url: string } } }>()
</script>
<template>
  <section v-if="content.backgroundImage?.url" class="relative bg-cover bg-center py-32 text-center text-white" :style="{ backgroundImage: `url(${content.backgroundImage.url})` }">
    <div class="absolute inset-0 bg-black/40" />
    <div class="relative z-10">
      <p class="tracking-widest uppercase">{{ content.title }}</p>
      <h1 class="my-4 text-4xl" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
  <section v-else class="py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ content.title }}</p>
    <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
  </section>
</template>
```

- [ ] **Step 4: Update elegant `themes/elegant/HeroSection.vue`**:
```vue
<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; backgroundImage: { mediaId: string; url: string } } }>()
</script>
<template>
  <section v-if="content.backgroundImage?.url" class="relative bg-cover bg-center py-32 text-center text-white" :style="{ backgroundImage: `url(${content.backgroundImage.url})` }">
    <div class="absolute inset-0 bg-black/45" />
    <div class="relative z-10">
      <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]">{{ formatDate(content.date, content.dateFormat) }}</p>
      <div class="mx-auto my-6 h-px w-16 bg-white/60" />
      <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p class="mt-4 uppercase tracking-[0.25em]">{{ content.title }}</p>
    </div>
  </section>
  <section v-else class="py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ formatDate(content.date, content.dateFormat) }}</p>
    <div class="mx-auto my-6 h-px w-16" style="background: var(--color-secondary)" />
    <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p class="mt-4 uppercase tracking-[0.25em]" style="color: var(--color-secondary)">{{ content.title }}</p>
  </section>
</template>
```

- [ ] **Step 5: Run, confirm PASS + no regressions** — `npx vitest run tests/components/hero-media.test.ts tests/components/sections.test.ts tests/components/package-a-base.test.ts tests/components/package-a-elegant.test.ts tests/components/elegant-sections.test.ts`

- [ ] **Step 6: Commit**
```bash
git add app/components/invitation/sections/HeroSection.vue app/components/invitation/themes/elegant/HeroSection.vue tests/components/hero-media.test.ts
git commit -m "feat: hero background photo (overlay text) in base + elegant"
```

---

## Task 3: Hero Slideshow section (base + elegant) + register

**Files:** Create `app/components/invitation/sections/HeroSlideshowSection.vue`, `app/components/invitation/themes/elegant/HeroSlideshowSection.vue`; modify `sectionComponents.ts`, `themePacks.ts`; Test `tests/components/hero-slideshow.test.ts`.

- [ ] **Step 1: Write the failing test** — create `tests/components/hero-slideshow.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/HeroSlideshowSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/HeroSlideshowSection.vue'

const c = (over = {}) => ({ title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', images: [], ...over })

for (const [name, Comp] of [['base', Base], ['elegant', Elegant]] as const) {
  describe(`HeroSlideshow (${name})`, () => {
    it('renders images + text when images exist', () => {
      const w = mount(Comp, { props: { content: c({ images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, { mediaId: 'n', url: 'https://cdn/b.jpg' }] }) } })
      expect(w.findAll('img').length).toBe(2)
      expect(w.text()).toContain('W & D')
      expect(w.text()).toContain('01 September 2026')
    })
    it('renders text-only fallback when no images', () => {
      const w = mount(Comp, { props: { content: c() } })
      expect(w.find('img').exists()).toBe(false)
      expect(w.text()).toContain('W & D')
    })
  })
}
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run tests/components/hero-slideshow.test.ts`

- [ ] **Step 3: Create base `app/components/invitation/sections/HeroSlideshowSection.vue`**:
```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatDate } from '~/utils/date-format'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; images: Img[] } }>()
const renderable = computed(() => (props.content.images ?? []).filter((i) => !!i.url))
const idx = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { if (renderable.value.length > 1) timer = setInterval(() => { idx.value = (idx.value + 1) % renderable.value.length }, 4000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
<template>
  <section class="relative overflow-hidden py-32 text-center text-white" style="background: var(--color-bg)">
    <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000" :class="i === idx ? 'opacity-100' : 'opacity-0'" loading="lazy" />
    <div class="absolute inset-0 bg-black/40" />
    <div class="relative z-10">
      <p class="tracking-widest uppercase">{{ content.title }}</p>
      <h1 class="my-4 text-4xl" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Create elegant `app/components/invitation/themes/elegant/HeroSlideshowSection.vue`**:
```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatDate } from '~/utils/date-format'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; images: Img[] } }>()
const renderable = computed(() => (props.content.images ?? []).filter((i) => !!i.url))
const idx = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { if (renderable.value.length > 1) timer = setInterval(() => { idx.value = (idx.value + 1) % renderable.value.length }, 4000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
<template>
  <section class="relative overflow-hidden py-36 text-center text-white" style="background: var(--color-bg)">
    <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000" :class="i === idx ? 'opacity-100' : 'opacity-0'" loading="lazy" />
    <div class="absolute inset-0 bg-black/45" />
    <div class="relative z-10">
      <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]">{{ formatDate(content.date, content.dateFormat) }}</p>
      <div class="mx-auto my-6 h-px w-16 bg-white/60" />
      <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p class="mt-4 uppercase tracking-[0.25em]">{{ content.title }}</p>
    </div>
  </section>
</template>
```

- [ ] **Step 5: Register**

`app/components/invitation/sectionComponents.ts`: add `import HeroSlideshowSection from './sections/HeroSlideshowSection.vue'` and add `hero_slideshow: HeroSlideshowSection,` to the map.

`app/components/invitation/themePacks.ts`: add `import ElegantHeroSlideshow from './themes/elegant/HeroSlideshowSection.vue'` and add `hero_slideshow: ElegantHeroSlideshow` to `packs.elegant`.

- [ ] **Step 6: Run, confirm PASS** — `npx vitest run tests/components/hero-slideshow.test.ts tests/components/section-map-alignment.test.ts tests/components/theme-packs.test.ts`

- [ ] **Step 7: Commit**
```bash
git add app/components/invitation/sections/HeroSlideshowSection.vue app/components/invitation/themes/elegant/HeroSlideshowSection.vue app/components/invitation/sectionComponents.ts app/components/invitation/themePacks.ts tests/components/hero-slideshow.test.ts
git commit -m "feat: Hero Slideshow section (auto-advance, overlay text) base + elegant"
```

---

## Task 4: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Suite + typecheck**

Run: `npx vitest run` — all pass (prior 216 + package B cases; the Task-1 alignment failure is resolved by Task 3).
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 2: Sanity**
```bash
grep -c "backgroundImage" server/registry/sections.ts app/components/invitation/sections/HeroSection.vue
grep -c "hero_slideshow" server/registry/sections.ts app/components/invitation/sectionComponents.ts app/components/invitation/themePacks.ts
ls app/components/invitation/sections/HeroSlideshowSection.vue app/components/invitation/themes/elegant/HeroSlideshowSection.vue
```
Expected: backgroundImage in registry + base hero; hero_slideshow in registry + base map + elegant pack; both slideshow files exist.

- [ ] **Step 3: Commit any straggler (only if needed)**
```bash
git add -A && git commit -m "chore: finalize package B hero media"
```
(Skip if clean. No migration; reseed not required — but `npm run db:reset` keeps the dev DB current for other packages.)

---

## Self-Review (done at write time)

- **Spec §3 (registry: hero bg + hero_slideshow):** Task 1. ✅
- **Spec §4 (hero bg render base + elegant):** Task 2. ✅
- **Spec §5 (slideshow base + elegant + register):** Task 3. ✅
- **Spec §6 (testing):** registry defaults/resilient (T1), hero bg both packs (T2), slideshow both packs incl. empty fallback (T3), alignment (T3). ✅
- **Spec §8 success criteria:** 1→T2 (bg optional, overlay vs solid), 2→T1+T3 (slideshow multi-image + auto-advance), 3→T3 (empty/one-image edge: timer only when >1, empty → text-only). ✅
- **Placeholder scan:** none — full component code included.
- **Type consistency:** hero content gains `backgroundImage: {mediaId,url}` in schema (T1) + both Hero variants (T2); `hero_slideshow` content `{title,coupleName,date,dateFormat,images:{mediaId,url}[]}` consistent in schema (T1) + both slideshow variants (T3); reuses `image`/`gallery`/`dateformat` field types (already mapped). ✅
- **Ordering:** Task 1 leaves `section-map-alignment` red (its gate runs only `tests/registry tests/document`); Task 3 maps `hero_slideshow` and restores green. Hero bg render (Task 2) is independent of the slideshow registration. ✅
- **No migration.** ✅
```

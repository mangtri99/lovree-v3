# Gallery Carousel + Lightbox (mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mobile, the gallery becomes a self-built carousel (main image + arrows + thumbnail strip + tap-to-zoom lightbox); desktop keeps the themed grid; an optional gallery title renders as a heading.

**Architecture:** A shared `GalleryCarousel.vue` (pure Vue state — `index`/`lightbox` refs, no carousel/lightbox lib, SSR-safe) is used by all three `GallerySection` variants inside a `md:hidden` container; the existing themed grid moves into a `hidden md:block`/`md:grid` container. `gallerySchema` gains an optional `title`.

**Tech Stack:** Nuxt 4, Vue 3, Tailwind, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-16-gallery-carousel-lightbox-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Note:** untracked `gallery.png` is the user's reference asset — leave it.

---

## File Structure

- `server/registry/sections.ts` (modify) — `gallerySchema` + gallery `fields` gain `title`.
- `app/components/invitation/GalleryCarousel.vue` (create) — shared carousel + lightbox.
- `app/components/invitation/sections/GallerySection.vue` (modify) — base: carousel(mobile)+grid(desktop)+title.
- `app/components/invitation/themes/elegant/GallerySection.vue` (modify) — same split, elegant chrome.
- `app/components/invitation/themes/dark_prada/GallerySection.vue` (modify) — same split, dark_prada chrome.
- Tests: `tests/registry/sections.test.ts` (modify), `tests/components/gallery-carousel.test.ts` (create), `tests/components/gallery-sections.test.ts` (create).

---

### Task 1: Gallery title in the registry

**Files:**
- Modify: `server/registry/sections.ts`
- Test: `tests/registry/sections.test.ts`

- [ ] **Step 1: Update the failing test**

In `tests/registry/sections.test.ts`, find the gallery defaults assertion (currently `expect(validateContent('gallery', {})).toEqual({ items: [] })`) and change it to:

```ts
    expect(validateContent('gallery', {})).toEqual({ title: '', items: [] })
```

Add (in the gallery describe block):

```ts
  it('gallery has a title text field', () => {
    expect((sectionRegistry as any).gallery.fields.title.type).toBe('text')
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: FAIL — gallery defaults are `{ items: [] }`, no `title` field.

- [ ] **Step 3: Implement**

In `server/registry/sections.ts`, change `gallerySchema`:

```ts
const gallerySchema = z.object({ title: z.string().default(''), items: galleryImages })
```

In the `gallery` registry entry's `fields`, add `title` before `items`:

```ts
    fields: {
      title: { type: 'text' as const, label: 'Judul Galeri' },
      items: { type: 'gallery' as const, label: 'Foto' },
    },
```

(If the gallery entry's `fields` currently only lists `items`, keep `items` exactly as it is and add the `title` line above it.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: gallery section gains an optional title"
```

---

### Task 2: GalleryCarousel component

**Files:**
- Create: `app/components/invitation/GalleryCarousel.vue`
- Test: `tests/components/gallery-carousel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/gallery-carousel.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GalleryCarousel from '../../app/components/invitation/GalleryCarousel.vue'

const imgs = (n: number) => Array.from({ length: n }, (_, i) => ({ mediaId: `m${i}`, url: `https://cdn/${i}.jpg` }))

describe('GalleryCarousel', () => {
  it('renders a main image and one thumbnail per image', () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(3) } })
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/0.jpg')
    expect(w.findAll('[data-thumb]').length).toBe(3)
  })
  it('next advances the main image and wraps', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(2) } })
    await w.find('[data-next]').trigger('click')
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/1.jpg')
    await w.find('[data-next]').trigger('click')
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/0.jpg')
  })
  it('clicking a thumbnail sets the main image', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(3) } })
    await w.findAll('[data-thumb]')[2].trigger('click')
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/2.jpg')
  })
  it('clicking the main image opens the lightbox; close hides it', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(2) } })
    expect(w.find('[data-lightbox]').exists()).toBe(false)
    await w.find('[data-main]').trigger('click')
    expect(w.find('[data-lightbox]').exists()).toBe(true)
    await w.find('[data-close]').trigger('click')
    expect(w.find('[data-lightbox]').exists()).toBe(false)
  })
  it('one image: no arrows, no thumbnails, still opens lightbox', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(1) } })
    expect(w.find('[data-next]').exists()).toBe(false)
    expect(w.findAll('[data-thumb]').length).toBe(0)
    await w.find('[data-main]').trigger('click')
    expect(w.find('[data-lightbox]').exists()).toBe(true)
  })
  it('zero images renders nothing', () => {
    const w = mount(GalleryCarousel, { props: { images: [] } })
    expect(w.find('[data-main]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/gallery-carousel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/components/invitation/GalleryCarousel.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineOptions({ name: 'GalleryCarousel' })
type Img = { mediaId: string; url: string }
const props = defineProps<{ images: Img[] }>()

const index = ref(0)
const lightbox = ref(false)

function go(i: number) {
  const n = props.images.length
  if (n) index.value = ((i % n) + n) % n
}
function prev() { go(index.value - 1) }
function next() { go(index.value + 1) }
function openLightbox() { lightbox.value = true }
function closeLightbox() { lightbox.value = false }

function onKey(e: KeyboardEvent) {
  if (!lightbox.value) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="images.length">
    <div class="relative">
      <img
        data-main :src="images[index].url" alt=""
        class="aspect-[4/5] w-full cursor-zoom-in rounded object-cover"
        loading="lazy" @click="openLightbox"
      />
      <button v-if="images.length > 1" type="button" data-prev aria-label="Sebelumnya"
        class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white" @click.stop="prev">‹</button>
      <button v-if="images.length > 1" type="button" data-next aria-label="Berikutnya"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white" @click.stop="next">›</button>
    </div>

    <div v-if="images.length > 1" class="mt-2 flex gap-2 overflow-x-auto">
      <img
        v-for="(img, i) in images" :key="i" data-thumb :src="img.url" alt=""
        class="h-16 w-16 flex-shrink-0 cursor-pointer rounded object-cover transition"
        :class="i === index ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-60'"
        loading="lazy" @click="go(i)"
      />
    </div>

    <div v-if="lightbox" data-lightbox class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" @click="closeLightbox">
      <img :src="images[index].url" alt="" class="max-h-[90vh] max-w-[95vw] object-contain" @click.stop />
      <button type="button" data-close aria-label="Tutup" class="absolute right-4 top-4 text-3xl text-white" @click.stop="closeLightbox">✕</button>
      <button v-if="images.length > 1" type="button" aria-label="Sebelumnya" class="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-white" @click.stop="prev">‹</button>
      <button v-if="images.length > 1" type="button" aria-label="Berikutnya" class="absolute right-4 top-1/2 -translate-y-1/2 text-4xl text-white" @click.stop="next">›</button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/gallery-carousel.test.ts`
Expected: PASS (6).

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/GalleryCarousel.vue tests/components/gallery-carousel.test.ts
git commit -m "feat: GalleryCarousel (main + thumbnails + lightbox, self-built)"
```

---

### Task 3: Wire carousel + title into the three GallerySection variants

**Files:**
- Modify: `app/components/invitation/sections/GallerySection.vue`, `app/components/invitation/themes/elegant/GallerySection.vue`, `app/components/invitation/themes/dark_prada/GallerySection.vue`
- Test: `tests/components/gallery-sections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/gallery-sections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/GallerySection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/GallerySection.vue'
import DarkPrada from '../../app/components/invitation/themes/dark_prada/GallerySection.vue'

const content = { title: 'Momen Bahagia Kami', items: [{ mediaId: 'a', url: 'https://cdn/a.jpg' }, { mediaId: 'b', url: 'https://cdn/b.jpg' }] }

for (const [name, Comp] of [['base', Base], ['elegant', Elegant], ['dark_prada', DarkPrada]] as const) {
  describe(`GallerySection (${name})`, () => {
    it('renders a GalleryCarousel and the title heading', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.findComponent({ name: 'GalleryCarousel' }).exists()).toBe(true)
      expect(w.text()).toContain('Momen Bahagia Kami')
    })
    it('omits the heading when title is empty', () => {
      const w = mount(Comp, { props: { content: { title: '', items: content.items } } })
      expect(w.text()).not.toContain('Momen Bahagia Kami')
    })
  })
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/gallery-sections.test.ts`
Expected: FAIL — no `GalleryCarousel` in the variants.

- [ ] **Step 3: Base `GallerySection.vue`**

Replace `app/components/invitation/sections/GallerySection.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import GalleryCarousel from '../GalleryCarousel.vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title?: string; items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-2 py-12">
    <h2 v-if="content.title" class="mb-6 text-center text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div class="hidden grid-cols-2 gap-2 md:grid md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
    </div>
  </section>
</template>
```

- [ ] **Step 4: Elegant `GallerySection.vue`**

Replace `app/components/invitation/themes/elegant/GallerySection.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import GalleryCarousel from '../../GalleryCarousel.vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title?: string; items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <h2 v-if="content.title" class="mb-6 text-center text-3xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div class="mx-auto hidden max-w-3xl gap-3 md:grid md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="aspect-square w-full rounded object-cover" loading="lazy" />
    </div>
  </section>
</template>
```

- [ ] **Step 5: Dark Prada `GallerySection.vue`**

Replace `app/components/invitation/themes/dark_prada/GallerySection.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import GalleryCarousel from '../../GalleryCarousel.vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title?: string; items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-3 py-14" style="background: var(--color-bg)">
    <h2 v-if="content.title" class="mb-6 text-center text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div class="mx-auto hidden max-w-3xl gap-2 md:grid md:grid-cols-3">
      <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="h-40 w-full rounded object-cover" style="border: 1px solid var(--color-primary)" loading="lazy" />
    </div>
  </section>
</template>
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/components/gallery-sections.test.ts`
Expected: PASS (6).

- [ ] **Step 7: Commit**

```bash
git add app/components/invitation/sections/GallerySection.vue app/components/invitation/themes/elegant/GallerySection.vue app/components/invitation/themes/dark_prada/GallerySection.vue tests/components/gallery-sections.test.ts
git commit -m "feat: gallery uses carousel on mobile, grid on desktop, optional title (all themes)"
```

---

### Task 4: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + gallery-carousel 6 + gallery-sections 6 + registry update). The 3 `starter-sections` WIP failures should already be resolved (tests aligned earlier); if any unrelated failure remains, report it without attributing to this work.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm complete: mobile gallery = carousel (main + arrows + thumbnails) with tap-to-zoom lightbox; desktop keeps the themed grid; optional title heading; all three themes share `GalleryCarousel`. Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 registry title → Task 1; §4 GalleryCarousel → Task 2; §5 variant wiring → Task 3; §6 testing → Tasks 1–3 + Task 4 gate. All covered.
- **Type consistency:** all variants use `content: { title?: string; items: Img[] }` and pass `renderable` (url-filtered) to `GalleryCarousel`'s `images` prop; `GalleryCarousel` `defineOptions({ name: 'GalleryCarousel' })` matches the `findComponent({ name })` in Task 3's test.
- **SSR safety:** `GalleryCarousel` uses only reactive state + `window` listeners added in `onMounted` (client-only); the first image renders server-side. No DOM library, so no `ClientOnly`/nuxt-env needed; `gallery-sections.test.ts` imports the dark_prada gallery variant, which has no static `/assets`, so default happy-dom is fine.
- **Desktop unchanged visually:** each variant's grid markup/classes are preserved inside the `hidden md:grid` container (mobile drops to the carousel); dark_prada's grid breakpoint normalised from `sm` to `md` to match the mobile/desktop split.
- **Registry test:** the gallery defaults test updated to `{ title: '', items: [] }` in the same task that adds the field (no cross-task red).

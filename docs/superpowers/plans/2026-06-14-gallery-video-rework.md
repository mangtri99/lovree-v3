# Gallery & Video Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the gallery photos-only with multi-upload + ↑/↓ reorder (a dedicated `GalleryControl`), and add a separate Video (YouTube) section.

**Architecture:** Gallery items become a flat `{ mediaId, url }[]`, edited by a new `'gallery'` field type → `GalleryControl` (thumbnail grid + multi-file upload + reorder). YouTube moves to a new `video` section type rendered by `VideoSection`, edited with the existing generic `ListControl`. No DB migration (JSONB; dev DB disposable).

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Zod, Vitest + @vue/test-utils.

**Branch:** `feat/phase-2b-media`.

**Grounding facts:**
- `field-types.ts`: gallery is currently a `union([galleryImageItem, galleryYoutubeItem])` resilient array (`galleryItems`), where the image item nests `image: { mediaId, url }`. `fieldTypes` record maps editor field kinds → zod (line ~26).
- `sections.ts`: `FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list'`. `gallerySchema = z.object({ items: galleryItems })`; gallery registry entry uses `type:'list'` with itemFields `type`/`image`/`videoId`. `validateContent(type, raw)` parses against the registry schema, defaults on failure.
- `FieldEditor.vue` control map: `{ text, longtext, date, url, youtube, image, list }` → control component, falls back to `TextControl`. `v-bind`s `itemFields`/`defaultItem` only for `type === 'list'`.
- `GallerySection.vue` renders both image (`item.image.url`) and youtube (`YouTubeEmbed`).
- `sectionComponents.ts` maps section type → component; `tests/components/section-map-alignment.test.ts` enforces every `SECTION_TYPES` entry has a component.
- `MediaUploader.vue` posts one image to `/api/admin/media` (`invitationId` from `inject('invitationId')`, `kind`, `file`) → `{ id, url }`. `GalleryControl` will do the same per file, in a loop.
- Existing tests that assume the OLD gallery shape and MUST be updated: `tests/registry/sections.test.ts` (the `gallery resilient validation` block) and `tests/components/gallery-section.test.ts`. (`tests/components/list-control.test.ts` mounts `ListControl` directly with hardcoded props — it keeps passing and needs no change.)

---

## File Structure

- Modify `server/registry/field-types.ts` — flat `galleryImages`; `fieldTypes.gallery`.
- Modify `server/registry/sections.ts` — gallery images-only + `'gallery'` field type + descriptor; new `video` section.
- Create `app/components/editor/controls/GalleryControl.vue`.
- Modify `app/components/editor/FieldEditor.vue` — map `gallery → GalleryControl`.
- Modify `app/components/invitation/sections/GallerySection.vue` — images-only render.
- Create `app/components/invitation/sections/VideoSection.vue`; modify `app/components/invitation/sectionComponents.ts`.
- Tests: `tests/registry/sections.test.ts` (update + add), `tests/components/gallery-control.test.ts` (new), `tests/components/gallery-section.test.ts` (rewrite), `tests/components/video-section.test.ts` (new), `tests/components/field-editor.test.ts` (add a case).

---

## Task 1: Schema — gallery images-only + video section

**Files:**
- Modify: `server/registry/field-types.ts`
- Modify: `server/registry/sections.ts`
- Test: `tests/registry/sections.test.ts`

- [ ] **Step 1: Update the failing tests**

In `tests/registry/sections.test.ts`, **replace** the entire `describe('gallery resilient validation', …)` block with:
```ts
describe('gallery (images only)', () => {
  it('defaults to no items', () => {
    expect(validateContent('gallery', {})).toEqual({ items: [] })
  })
  it('coerces items to {mediaId,url}, drops non-object items, never resets', () => {
    const out = validateContent('gallery', { items: [
      { mediaId: 'm1', url: 'https://cdn/x.jpg' },
      {},
      { type: 'youtube', videoId: 'abc' }, // legacy → coerced to empty image
      'bogus',                              // non-object → dropped
    ] })
    expect(out.items).toEqual([
      { mediaId: 'm1', url: 'https://cdn/x.jpg' },
      { mediaId: '', url: '' },
      { mediaId: '', url: '' },
    ])
  })
})

describe('video section', () => {
  it('defaults to empty videos', () => {
    expect(validateContent('video', {})).toEqual({ videos: [] })
  })
  it('preserves videoId rows and defaults a blank one', () => {
    expect(validateContent('video', { videos: [{ videoId: 'dQw4w9WgXcQ' }, {}] }))
      .toEqual({ videos: [{ videoId: 'dQw4w9WgXcQ' }, { videoId: '' }] })
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/registry/sections.test.ts -t "gallery (images only)"` and `… -t "video section"`
Expected: FAIL — gallery still nests `image`; `video` is not a registry type.

- [ ] **Step 3: Update `field-types.ts`**

Add the flat gallery image array (place near the existing gallery exports):
```ts
export const galleryImage = z.object({ mediaId: z.string().default(''), url: z.string().default('') })
export const galleryImages = z
  .array(galleryImage.catch(undefined as any))
  .transform((a) => a.filter(Boolean))
  .default([])
```
(Leave the older `galleryImageItem`/`galleryYoutubeItem`/`galleryItems` exports in place — they become unused but removing them is out of scope.)

Extend the `fieldTypes` record with a `gallery` key (for editor-registry parity):
```ts
  gallery: z.array(z.object({ mediaId: z.string().default(''), url: z.string().default('') })),
```

- [ ] **Step 4: Update `sections.ts`**

1. Change the field-types import to also bring in `galleryImages` (keep whatever else is imported):
```ts
import { galleryImages } from './field-types'
```
(Replace the `galleryItems` import; if `galleryItems` is imported on the same line and now unused, drop it.)

2. Extend the `FieldType` union with `'gallery'`:
```ts
export type FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list' | 'gallery'
```

3. Replace `gallerySchema`:
```ts
const gallerySchema = z.object({ items: galleryImages })
```

4. Add the video schemas near the other section schemas:
```ts
const videoItem = z.object({ videoId: z.string().default('') })
const videoSchema = z.object({ videos: z.array(videoItem).default([]) })
```

5. Replace the gallery registry entry's `fields` with the dedicated control:
```ts
  gallery: {
    schema: gallerySchema,
    label: 'Galeri',
    fields: {
      items: { type: 'gallery' as const, label: 'Foto' },
    },
  },
```

6. Add a `video` registry entry (place it right after the `gallery` entry):
```ts
  video: {
    schema: videoSchema,
    label: 'Video',
    fields: {
      videos: {
        type: 'list' as const,
        label: 'Video',
        defaultItem: { videoId: '' },
        itemFields: { videoId: { type: 'youtube' as const, label: 'YouTube ID' } },
      },
    },
  },
```

- [ ] **Step 5: Run, confirm PASS (registry + document only)**

Run: `npx vitest run tests/registry tests/document`
Expected: registry + document tests PASS. (`tests/components/section-map-alignment.test.ts` will now FAIL because `video` has no component yet — expected, fixed in Task 4. Do NOT run the components suite as a gate here.)

- [ ] **Step 6: Commit**

```bash
git add server/registry/field-types.ts server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: gallery images-only schema + new video section type"
```

---

## Task 2: GalleryControl (multi-upload + reorder)

**Files:**
- Create: `app/components/editor/controls/GalleryControl.vue`
- Modify: `app/components/editor/FieldEditor.vue`
- Test: `tests/components/gallery-control.test.ts`; `tests/components/field-editor.test.ts` (add a case)

- [ ] **Step 1: Write the failing test**

Create `tests/components/gallery-control.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GalleryControl from '../../app/components/editor/controls/GalleryControl.vue'

const imgs = [
  { mediaId: 'a', url: 'https://cdn/a.jpg' },
  { mediaId: 'b', url: 'https://cdn/b.jpg' },
  { mediaId: 'c', url: 'https://cdn/c.jpg' },
]

describe('GalleryControl', () => {
  it('renders a thumbnail per image', () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs, label: 'Foto' } })
    expect(w.findAll('img').length).toBe(3)
    expect(w.find('img').attributes('src')).toBe('https://cdn/a.jpg')
  })
  it('move down swaps an item with the next', async () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs } })
    await w.findAll('[data-act="down"]')[0].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toEqual([imgs[1], imgs[0], imgs[2]])
  })
  it('move up swaps an item with the previous', async () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs } })
    await w.findAll('[data-act="up"]')[2].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toEqual([imgs[0], imgs[2], imgs[1]])
  })
  it('remove drops the item', async () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs } })
    await w.findAll('[data-act="remove"]')[1].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toEqual([imgs[0], imgs[2]])
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/gallery-control.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create `app/components/editor/controls/GalleryControl.vue`**

```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ modelValue: Img[]; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [Img[]] }>()
const invitationId = inject<string>('invitationId', '')
const busy = ref(false)
const error = ref('')

function update(items: Img[]) { emit('update:modelValue', items) }
function removeAt(i: number) { const a = [...props.modelValue]; a.splice(i, 1); update(a) }
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= props.modelValue.length) return
  const a = [...props.modelValue]
  ;[a[i], a[j]] = [a[j], a[i]]
  update(a)
}
async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  busy.value = true; error.value = ''
  const added: Img[] = []
  for (const file of files) {
    try {
      const form = new FormData()
      form.append('invitationId', invitationId)
      form.append('kind', 'image')
      form.append('file', file)
      const res = await $fetch<{ id: string; url: string }>('/api/admin/media', { method: 'POST', body: form })
      added.push({ mediaId: res.id, url: res.url })
    } catch (err: any) { error.value = err?.data?.message ?? 'Upload gagal' }
  }
  if (added.length) update([...(props.modelValue ?? []), ...added])
  ;(e.target as HTMLInputElement).value = ''
  busy.value = false
}
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <div v-if="modelValue.length" class="mb-2 grid grid-cols-3 gap-2">
      <div v-for="(img, i) in modelValue" :key="i" class="relative">
        <img :src="img.url" alt="" class="h-20 w-full rounded object-cover" />
        <div class="absolute right-1 top-1 flex gap-1">
          <button type="button" data-act="up" class="rounded bg-white/80 px-1 text-xs" :disabled="i === 0" @click="move(i, -1)">↑</button>
          <button type="button" data-act="down" class="rounded bg-white/80 px-1 text-xs" :disabled="i === modelValue.length - 1" @click="move(i, 1)">↓</button>
          <button type="button" data-act="remove" class="rounded bg-white/80 px-1 text-xs text-red-600" @click="removeAt(i)">×</button>
        </div>
      </div>
    </div>
    <input type="file" accept="image/png,image/jpeg,image/webp" multiple :disabled="busy" @change="onFiles" />
    <span v-if="busy" class="text-xs text-gray-500">Mengunggah…</span>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>
```

- [ ] **Step 4: Map `gallery` in FieldEditor**

In `app/components/editor/FieldEditor.vue`, add the import and the map entry:
```ts
import GalleryControl from './controls/GalleryControl.vue'
```
and add `gallery: GalleryControl` to the control map object:
```ts
const control = computed(() => ({
  text: TextControl, longtext: LongtextControl, date: DateControl,
  url: UrlControl, youtube: YoutubeControl, image: ImageControl, list: ListControl, gallery: GalleryControl,
} as Record<string, any>)[props.descriptor.type] ?? TextControl)
```

Add a case to `tests/components/field-editor.test.ts`:
```ts
import GalleryControl from '../../app/components/editor/controls/GalleryControl.vue'

it('maps the gallery field type to GalleryControl', () => {
  const w = mount(FieldEditor, { props: { descriptor: { key: 'items', type: 'gallery', label: 'Foto' }, modelValue: [] }, ...opts })
  expect(w.findComponent(GalleryControl).exists()).toBe(true)
})
```
(Use the same `opts`/imports the existing `field-editor.test.ts` uses — it already mounts `FieldEditor` with `nuxtUiStubs`.)

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/gallery-control.test.ts tests/components/field-editor.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/controls/GalleryControl.vue app/components/editor/FieldEditor.vue tests/components/gallery-control.test.ts tests/components/field-editor.test.ts
git commit -m "feat: GalleryControl — multi-upload, thumbnails, up/down reorder, remove"
```

---

## Task 3: GallerySection images-only render

**Files:**
- Modify: `app/components/invitation/sections/GallerySection.vue`
- Test: `tests/components/gallery-section.test.ts` (rewrite)

- [ ] **Step 1: Rewrite the test**

Replace `tests/components/gallery-section.test.ts` with:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GallerySection from '../../app/components/invitation/sections/GallerySection.vue'

describe('GallerySection', () => {
  it('renders an <img> per image with a non-empty url', () => {
    const w = mount(GallerySection, { props: { content: { items: [
      { mediaId: 'm1', url: 'https://cdn/a.jpg' },
      { mediaId: 'm2', url: 'https://cdn/b.jpg' },
    ] } } })
    const imgs = w.findAll('img')
    expect(imgs.length).toBe(2)
    expect(imgs[0].attributes('src')).toBe('https://cdn/a.jpg')
    expect(imgs[0].attributes('loading')).toBe('lazy')
  })
  it('skips an item with an empty url', () => {
    const w = mount(GallerySection, { props: { content: { items: [{ mediaId: '', url: '' }] } } })
    expect(w.find('img').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/gallery-section.test.ts`
Expected: FAIL — the component reads `item.image.url` (old shape).

- [ ] **Step 3: Rewrite the component**

Replace `app/components/invitation/sections/GallerySection.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-2 py-12">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
    </div>
  </section>
</template>
```

- [ ] **Step 4: Run, confirm PASS**

Run: `npx vitest run tests/components/gallery-section.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/sections/GallerySection.vue tests/components/gallery-section.test.ts
git commit -m "feat: gallery renders photos only (flat {mediaId,url})"
```

---

## Task 4: VideoSection + map

**Files:**
- Create: `app/components/invitation/sections/VideoSection.vue`
- Modify: `app/components/invitation/sectionComponents.ts`
- Test: `tests/components/video-section.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/video-section.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VideoSection from '../../app/components/invitation/sections/VideoSection.vue'

const stubs = { YouTubeEmbed: { name: 'YouTubeEmbed', props: ['videoId'], template: '<div class="yt" />' } }

describe('VideoSection', () => {
  it('renders a YouTubeEmbed for each valid 11-char id, skipping invalid/empty', () => {
    const w = mount(VideoSection, {
      props: { content: { videos: [{ videoId: 'dQw4w9WgXcQ' }, { videoId: '' }, { videoId: 'abc' }] } },
      global: { stubs },
    })
    expect(w.findAllComponents({ name: 'YouTubeEmbed' }).length).toBe(1)
  })
})
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/video-section.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

Create `app/components/invitation/sections/VideoSection.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ content: { videos: { videoId: string }[] } }>()
const isValid = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id)
const renderable = computed(() => (props.content.videos ?? []).filter((v) => isValid(v.videoId)))
</script>
<template>
  <section class="space-y-4 px-6 py-12">
    <YouTubeEmbed v-for="(v, i) in renderable" :key="i" :video-id="v.videoId" />
  </section>
</template>
```

- [ ] **Step 4: Map the component**

In `app/components/invitation/sectionComponents.ts`, add the import and the map entry:
```ts
import VideoSection from './sections/VideoSection.vue'
```
and add `video: VideoSection,` to the `sectionComponents` object.

- [ ] **Step 5: Run, confirm PASS**

Run: `npx vitest run tests/components/video-section.test.ts tests/components/section-map-alignment.test.ts`
Expected: PASS (both alignment directions satisfied now that `video` is mapped).

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/sections/VideoSection.vue app/components/invitation/sectionComponents.ts tests/components/video-section.test.ts
git commit -m "feat: render VideoSection and map the video section type"
```

---

## Task 5: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 166 + the new gallery/video cases; the previously-expected `section-map-alignment` failure from Task 1 is now resolved). Zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Sanity**

Run:
```bash
grep -n "video:" server/registry/sections.ts app/components/invitation/sectionComponents.ts
grep -n "gallery: GalleryControl" app/components/editor/FieldEditor.vue
grep -rn "item.image" app/components/invitation/sections/GallerySection.vue || echo "no old nested shape (clean)"
```
Expected: `video` in registry + map; gallery mapped in FieldEditor; no `item.image` in GallerySection.

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize gallery & video rework"
```
(Skip if the tree is already clean.)

---

## Self-Review (done at write time)

- **Spec §3 (schema):** Task 1 (gallery flat images-only + video schema + `'gallery'` field type). ✅
- **Spec §4 (GalleryControl):** Task 2 (multi-upload loop, thumbnails, ↑/↓ reorder, remove; FieldEditor map). ✅
- **Spec §5 (video section):** Task 1 (registry) + Task 4 (VideoSection + map). ✅
- **Spec §6 (GallerySection):** Task 3. ✅
- **Spec §7 (testing):** pure gallery/video (Task 1), GalleryControl (Task 2), GallerySection (Task 3), VideoSection + alignment (Task 4), FieldEditor map (Task 2). ✅
- **Spec §9 success criteria:** 1→T1+T2+T3, 2→T1+T4, 3→T1 (youtube gone from gallery) + T4, 4→T1 (resilient coercion, never resets). ✅
- **Placeholder scan:** none.
- **Type consistency:** gallery item `{ mediaId, url }` flat used in field-types (`galleryImage`), GallerySection, GalleryControl, and tests; `video` content `{ videos: { videoId }[] }` in schema, VideoSection, tests; `'gallery'` field type in `FieldType`, `fieldTypes`, registry descriptor, FieldEditor map. ✅
- **No migration:** JSONB; legacy gallery youtube items coerce to empty image items (filtered out at render) — acceptable, dev DB disposable. ✅
- **Ordering note for the implementer:** Task 1 leaves `section-map-alignment` red until Task 4 (its Step 5 runs only `tests/registry tests/document`). The full suite is green again after Task 4.
```

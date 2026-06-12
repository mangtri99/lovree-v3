# Phase 2b-media (Media Completion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded media usable in real invitations — resolve gallery + couple-photo images to URLs, wire audio to the invitation's music track, fix the latent gallery data-loss bug, and tighten the publish edge-cache window.

**Architecture:** Images store `{ mediaId, url }` directly in the JSONB document at pick-time (no read-time media join); plain `<img :src>` renders them. Music is an invitation-level setting (`invitations.musicMediaId`) set via a new `PATCH /music` endpoint guarded by a pure ownership+belongs predicate, surfaced in a new editor settings panel. The gallery data-loss bug is fixed in three layers: type-correct default list items, a resilient (per-item-dropping) gallery schema, and an autosave reconcile step that adopts the server-normalized document without looping the deep watcher.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Zod, Drizzle ORM (neon-http), Vitest + @vue/test-utils, Nuxt UI v4 (admin).

**Branch:** `feat/foundation-renderer` (same as 2a). No DB migration — `music_media_id` column already exists; photo/gallery shapes live in `draft_document` JSONB and the seed has no photos.

**Decisions baked in (from spec + review):**
- **Image content shape:** `{ mediaId: string, url: string }` (decision A).
- **YouTube gallery items go lenient too:** `videoId` becomes `z.string().default('')` (not the strict 11-char regex inside the document) so a half-typed id is not silently dropped on autosave. `GallerySection` skips rendering an item whose `videoId` is empty/invalid. This serves the phase goal ("never silently lose gallery edits") — a strict regex here would reproduce the exact data-loss feeling we're fixing.
- **Reconcile must not loop:** `edit.vue` watches `editor.doc` with `{ deep: true }`. The reconcile adopts the server document **only when it differs** from the current sections; an identical adopt is skipped, so the one extra watcher cycle converges instead of hanging.
- **MediaUploader emit contract changes** from `uploaded: [string]` to `uploaded: [{ id: string; url: string }]`. Sole current consumer is `ImageControl.vue`; the new music control is the second consumer — both updated in the tasks that touch them.

---

## File Structure

**Schema / pure logic (server):**
- Modify `server/registry/field-types.ts` — replace strict gallery union with lenient image/youtube item schemas; loosen `fieldTypes.image` to the object shape (key set unchanged).
- Modify `server/registry/sections.ts` — `gallerySchema.items` resilient array; `personSchema.photoMediaId` → `photo` object; gallery `items` descriptor gains `defaultItem`; couple `people` itemFields `photoMediaId` → `photo`; add `defaultItem?` to `FieldDescriptor`.
- Create `server/utils/media-belongs.ts` — pure `mediaBelongsToInvitation` predicate.
- Create `app/composables/useReconcile.ts` — pure `reconcileSections` helper.

**Endpoints (server):**
- Create `server/api/admin/invitations/[id]/music.patch.ts` — set/clear `musicMediaId`.
- Modify `server/api/admin/invitations/[id]/index.get.ts` — add `musicMediaId` + resolved `musicUrl`.
- Modify `server/api/invitations/[slug].get.ts` — `s-maxage` 300 → 60.

**Components / page (app):**
- Modify `app/components/editor/MediaUploader.vue` — emit `{ id, url }`.
- Modify `app/components/editor/controls/ImageControl.vue` — store `{ mediaId, url }`, show thumbnail.
- Create `app/components/editor/controls/ListControl` change — push `defaultItem`.
- Modify `app/components/editor/FieldEditor.vue` — forward `defaultItem` to ListControl.
- Modify `app/components/editor/controls/ListControl.vue` — `add()` uses `defaultItem`.
- Modify `app/components/invitation/sections/GallerySection.vue` — plain `<img>` + skip empty youtube.
- Modify `app/components/invitation/sections/CoupleSection.vue` — render `photo.url`.
- Create `app/components/editor/InvitationSettings.vue` — settings panel w/ music control.
- Modify `app/components/editor/EditorPreview.vue` — optional `musicUrl` → MusicPlayer on cover.
- Modify `app/pages/admin/invitations/[id]/edit.vue` — reconcile in `save()`, mount settings panel, pass `musicUrl`.

**Tests:** co-located under `tests/registry`, `tests/document`, `tests/components`, `tests/composables`, `tests/utils`.

---

## Task 1: Resilient gallery item schema (keystone layer 2)

**Files:**
- Modify: `server/registry/field-types.ts`
- Modify: `server/registry/sections.ts:53` (`gallerySchema`)
- Test: `tests/registry/sections.test.ts` (add cases) and `tests/document/validate.test.ts` (add a case)

- [ ] **Step 1: Write the failing test**

Add to `tests/registry/sections.test.ts`:

```ts
import { validateContent } from '../../server/registry/sections'

describe('gallery resilient validation', () => {
  it('drops malformed items but keeps the rest (section not reset)', () => {
    const out = validateContent('gallery', {
      items: [
        { type: 'image', mediaId: 'm1', url: 'https://cdn/x.jpg' },
        {}, // the bug trigger: empty item from "+ Tambah"
        { type: 'youtube', videoId: 'dQw4w9WgXcQ' },
        { type: 'bogus' },
      ],
    })
    expect(out.items).toEqual([
      { type: 'image', mediaId: 'm1', url: 'https://cdn/x.jpg' },
      { type: 'youtube', videoId: 'dQw4w9WgXcQ' },
    ])
  })

  it('keeps an image item with empty url (just uploaded, url pending is still valid)', () => {
    const out = validateContent('gallery', { items: [{ type: 'image', mediaId: '', url: '' }] })
    expect(out.items).toEqual([{ type: 'image', mediaId: '', url: '' }])
  })

  it('keeps a youtube item with a partial id instead of dropping it', () => {
    const out = validateContent('gallery', { items: [{ type: 'youtube', videoId: 'abc' }] })
    expect(out.items).toEqual([{ type: 'youtube', videoId: 'abc' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts -t "gallery resilient"`
Expected: FAIL — current `discriminatedUnion` resets the whole section to `{ items: [] }` when `{}` is present, and the strict youtube regex drops `'abc'`.

- [ ] **Step 3: Implement the lenient item schemas in `field-types.ts`**

Replace the three gallery-item exports (`field-types.ts:6-8`) with:

```ts
// Strict media ids are still useful elsewhere; keep them for non-document use.
export const mediaImageItem = z.object({ type: z.literal('image'), mediaId: z.string().uuid() })
export const mediaYoutubeItem = z.object({ type: z.literal('youtube'), videoId: youtubeId })

// Document-stored gallery items are lenient so in-progress edits are never dropped:
// an image holds { mediaId, url } (url stored at pick-time), and a youtube item
// holds a free-form videoId (validated/skipped at render, not at save).
export const galleryImageItem = z.object({
  type: z.literal('image'),
  mediaId: z.string().default(''),
  url: z.string().default(''),
})
export const galleryYoutubeItem = z.object({
  type: z.literal('youtube'),
  videoId: z.string().default(''),
})
// Resilient array: a bad item becomes undefined and is filtered out; the section survives.
export const galleryItems = z
  .array(z.union([galleryImageItem, galleryYoutubeItem]).catch(undefined as any))
  .transform((a) => a.filter(Boolean))
  .default([])
```

Also loosen the generic `image` field type (key set must stay identical so `tests/registry/field-types.test.ts` still passes):

```ts
export const fieldTypes = {
  text: z.string(),
  longtext: z.string(),
  image: z.object({ mediaId: z.string().default(''), url: z.string().default('') }), // { mediaId, url }
  date: z.string(),
  list: z.array(z.unknown()),
  url: z.string().url(),
  youtube: youtubeId,
} as const
```

- [ ] **Step 4: Wire the resilient array into `gallerySchema`**

In `server/registry/sections.ts`, update the import and schema. Change the import line:

```ts
import { galleryItems } from './field-types'
```

Replace `gallerySchema` (line 53):

```ts
const gallerySchema = z.object({ items: galleryItems })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/registry/sections.test.ts tests/registry/field-types.test.ts tests/document/validate.test.ts`
Expected: PASS (new gallery cases + existing field-type/key + validate cases all green).

- [ ] **Step 6: Commit**

```bash
git add server/registry/field-types.ts server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "fix: resilient gallery item schema drops bad items instead of wiping the section"
```

---

## Task 2: Type-correct default list items (keystone layer 1)

**Files:**
- Modify: `server/registry/sections.ts` (`FieldDescriptor` + gallery `items` descriptor)
- Modify: `app/components/editor/FieldEditor.vue:23`
- Modify: `app/components/editor/controls/ListControl.vue:6,13`
- Test: `tests/components/list-control.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/list-control.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ListControl from '../../app/components/editor/controls/ListControl.vue'

describe('ListControl', () => {
  it('pushes defaultItem when adding (type-correct gallery item)', async () => {
    const w = mount(ListControl, {
      props: {
        modelValue: [],
        itemFields: { type: { type: 'text', label: 'Tipe' } },
        defaultItem: { type: 'image', mediaId: '', url: '' },
      },
    })
    await w.find('button.rounded.border').trigger('click') // "+ Tambah"
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[0][0]).toEqual([{ type: 'image', mediaId: '', url: '' }])
  })

  it('falls back to an empty object when no defaultItem is provided', async () => {
    const w = mount(ListControl, { props: { modelValue: [], itemFields: { a: { type: 'text', label: 'A' } } } })
    await w.find('button.rounded.border').trigger('click')
    expect(w.emitted('update:modelValue')![0][0]).toEqual([{}])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/list-control.test.ts`
Expected: FAIL — `ListControl` has no `defaultItem` prop; `add()` always pushes `{}`.

- [ ] **Step 3: Add `defaultItem` to the descriptor type + gallery descriptor**

In `server/registry/sections.ts`, extend `FieldDescriptor` (line 5-9):

```ts
export interface FieldDescriptor {
  type: FieldType
  label: string
  itemFields?: Record<string, FieldDescriptor>
  defaultItem?: Record<string, unknown>
}
```

Give the gallery `items` descriptor a `defaultItem` (the gallery `items` field, ~line 153) so a new item is union-valid immediately:

```ts
      items: {
        type: 'list' as const,
        label: 'Galeri',
        defaultItem: { type: 'image', mediaId: '', url: '' },
        itemFields: {
          type: { type: 'text' as const, label: 'Tipe (image/youtube)' },
          mediaId: { type: 'image' as const, label: 'Gambar' },
          videoId: { type: 'youtube' as const, label: 'YouTube ID' },
        },
      },
```

- [ ] **Step 4: Implement `defaultItem` in ListControl + forward it from FieldEditor**

`app/components/editor/controls/ListControl.vue` — update props (line 6) and `add()` (line 13):

```ts
const props = defineProps<{ modelValue: any[]; label?: string; itemFields: Record<string, any>; defaultItem?: Record<string, unknown> }>()
```

```ts
function add() { update([...(props.modelValue ?? []), props.defaultItem ? { ...props.defaultItem } : {}]) }
```

`app/components/editor/FieldEditor.vue` — forward `defaultItem` to the list control (line 23):

```vue
    v-bind="descriptor.type === 'list' ? { itemFields: descriptor.itemFields, defaultItem: descriptor.defaultItem } : {}"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/list-control.test.ts tests/components/field-editor.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/registry/sections.ts app/components/editor/controls/ListControl.vue app/components/editor/FieldEditor.vue tests/components/list-control.test.ts
git commit -m "fix: gallery list adds a type-correct default item"
```

---

## Task 3: Couple person photo object

**Files:**
- Modify: `server/registry/sections.ts` (`personSchema` + couple descriptor)
- Test: `tests/registry/sections.test.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Add to `tests/registry/sections.test.ts`:

```ts
describe('couple person photo', () => {
  it('defaults photo to an empty object', () => {
    const out = validateContent('couple', { people: [{ name: 'Willy' }] })
    expect(out.people[0].photo).toEqual({ mediaId: '', url: '' })
  })
  it('preserves a set photo', () => {
    const out = validateContent('couple', { people: [{ name: 'W', photo: { mediaId: 'm1', url: 'https://cdn/p.jpg' } }] })
    expect(out.people[0].photo).toEqual({ mediaId: 'm1', url: 'https://cdn/p.jpg' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts -t "couple person photo"`
Expected: FAIL — `personSchema` has `photoMediaId`, not `photo`.

- [ ] **Step 3: Replace `photoMediaId` with `photo` in `personSchema`**

`server/registry/sections.ts:22-29`:

```ts
const personSchema = z.object({
  name: z.string().default(''),
  parents: z.string().default(''),
  childOrder: z.string().default(''),
  address: z.string().default(''),
  instagram: z.string().default(''),
  photo: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' }),
})
```

And the couple `people` itemFields descriptor (line 95) — rename `photoMediaId` → `photo`:

```ts
          photo: { type: 'image' as const, label: 'Foto' },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: couple person photo stored as { mediaId, url }"
```

---

## Task 4: MediaUploader emits { id, url }; ImageControl stores the object

**Files:**
- Modify: `app/components/editor/MediaUploader.vue:4,22`
- Modify: `app/components/editor/controls/ImageControl.vue` (full rewrite)
- Test: `tests/components/image-control.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/image-control.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageControl from '../../app/components/editor/controls/ImageControl.vue'

describe('ImageControl', () => {
  it('emits { mediaId, url } when the uploader reports an upload', async () => {
    const w = mount(ImageControl, { props: { modelValue: { mediaId: '', url: '' }, label: 'Foto' } })
    const uploader = w.findComponent({ name: 'MediaUploader' })
    uploader.vm.$emit('uploaded', { id: 'abc', url: 'https://cdn/x.jpg' })
    await w.vm.$nextTick()
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[0][0]).toEqual({ mediaId: 'abc', url: 'https://cdn/x.jpg' })
  })

  it('shows a thumbnail when a url is set', () => {
    const w = mount(ImageControl, { props: { modelValue: { mediaId: 'abc', url: 'https://cdn/x.jpg' }, label: 'Foto' } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn/x.jpg')
  })

  it('renders just the uploader when empty', () => {
    const w = mount(ImageControl, { props: { modelValue: { mediaId: '', url: '' }, label: 'Foto' } })
    expect(w.find('img').exists()).toBe(false)
  })
})
```

> Note: `MediaUploader` injects `invitationId`; mounting `ImageControl` mounts `MediaUploader` as a child. `inject` with a default of `''` (already in MediaUploader) keeps it from throwing in a bare mount. No global stub needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/image-control.test.ts`
Expected: FAIL — ImageControl emits a bare id string and renders no `<img>`.

- [ ] **Step 3: Change MediaUploader's emit to `{ id, url }`**

`app/components/editor/MediaUploader.vue` — line 4:

```ts
const emit = defineEmits<{ uploaded: [{ id: string; url: string }] }>()
```

Line 22 (inside `onChange`, after the `$fetch`):

```ts
    const res = await $fetch<{ id: string; url: string }>('/api/admin/media', { method: 'POST', body: form })
    emit('uploaded', { id: res.id, url: res.url })
```

- [ ] **Step 4: Rewrite ImageControl to store the object + show a thumbnail**

Replace `app/components/editor/controls/ImageControl.vue` entirely:

```vue
<script setup lang="ts">
import MediaUploader from '../MediaUploader.vue'
type ImageValue = { mediaId: string; url: string }
const props = defineProps<{ modelValue: ImageValue | null; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [ImageValue] }>()
function onUploaded(media: { id: string; url: string }) {
  emit('update:modelValue', { mediaId: media.id, url: media.url })
}
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <img v-if="modelValue?.url" :src="modelValue.url" alt="" class="mb-2 h-20 w-20 rounded object-cover" />
    <MediaUploader kind="image" @uploaded="onUploaded" />
  </div>
</template>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/image-control.test.ts tests/components/media-uploader.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/MediaUploader.vue app/components/editor/controls/ImageControl.vue tests/components/image-control.test.ts
git commit -m "feat: image control stores { mediaId, url } and previews a thumbnail"
```

---

## Task 5: GallerySection renders stored url (plain img) + skips empty youtube

**Files:**
- Modify: `app/components/invitation/sections/GallerySection.vue` (full rewrite)
- Test: `tests/components/gallery-section.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/gallery-section.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GallerySection from '../../app/components/invitation/sections/GallerySection.vue'

const stubs = { YouTubeEmbed: { name: 'YouTubeEmbed', props: ['videoId'], template: '<div class="yt" />' } }

describe('GallerySection', () => {
  it('renders <img> with the stored url for image items', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [{ type: 'image', mediaId: 'm1', url: 'https://cdn/x.jpg' }] } },
      global: { stubs },
    })
    const img = w.find('img')
    expect(img.attributes('src')).toBe('https://cdn/x.jpg')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('renders YouTubeEmbed for valid youtube items and skips empty/invalid ones', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [
        { type: 'youtube', videoId: 'dQw4w9WgXcQ' },
        { type: 'youtube', videoId: '' },     // skipped
        { type: 'youtube', videoId: 'abc' },  // skipped (not 11 chars)
      ] } },
      global: { stubs },
    })
    expect(w.findAllComponents({ name: 'YouTubeEmbed' }).length).toBe(1)
  })

  it('does not render an img for an image item with empty url', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [{ type: 'image', mediaId: '', url: '' }] } },
      global: { stubs },
    })
    expect(w.find('img').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/gallery-section.test.ts`
Expected: FAIL — current section uses `NuxtImg` with `item.mediaId` as src and does not skip invalid youtube ids.

- [ ] **Step 3: Rewrite GallerySection**

Replace `app/components/invitation/sections/GallerySection.vue` entirely:

```vue
<script setup lang="ts">
import { computed } from 'vue'
type ImageItem = { type: 'image'; mediaId: string; url: string }
type YoutubeItem = { type: 'youtube'; videoId: string }
type Item = ImageItem | YoutubeItem
const props = defineProps<{ content: { items: Item[] } }>()

const isValidYoutube = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id)
// Render only items that have something to show; partial edits stay in the data
// but are not rendered until complete.
const renderable = computed(() => (props.content.items ?? []).filter((it) =>
  it.type === 'image' ? !!it.url : isValidYoutube(it.videoId)))
</script>
<template>
  <section class="px-2 py-12">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
      <template v-for="(item, i) in renderable" :key="i">
        <YouTubeEmbed v-if="item.type === 'youtube'" :video-id="item.videoId" class="col-span-2 md:col-span-3" />
        <img v-else :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
      </template>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/gallery-section.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/sections/GallerySection.vue tests/components/gallery-section.test.ts
git commit -m "feat: gallery renders stored image url and skips incomplete items"
```

---

## Task 6: CoupleSection renders the photo

**Files:**
- Modify: `app/components/invitation/sections/CoupleSection.vue`
- Test: `tests/components/couple-section.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/couple-section.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoupleSection from '../../app/components/invitation/sections/CoupleSection.vue'

const person = (over = {}) => ({ name: 'Willy', parents: '', childOrder: '', address: '', instagram: '', photo: { mediaId: '', url: '' }, ...over })

describe('CoupleSection', () => {
  it('renders a photo when photo.url is set', () => {
    const w = mount(CoupleSection, { props: { content: { people: [person({ photo: { mediaId: 'm1', url: 'https://cdn/p.jpg' } })] } } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn/p.jpg')
  })
  it('renders no photo when url is empty', () => {
    const w = mount(CoupleSection, { props: { content: { people: [person()] } } })
    expect(w.find('img').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/couple-section.test.ts`
Expected: FAIL — CoupleSection never renders a photo.

- [ ] **Step 3: Add the photo render path**

Replace `app/components/invitation/sections/CoupleSection.vue` entirely:

```vue
<script setup lang="ts">
type Person = { name: string; parents: string; childOrder: string; address: string; instagram: string; photo: { mediaId: string; url: string } }
defineProps<{ content: { people: Person[] } }>()
</script>
<template>
  <section class="space-y-10 px-6 py-12">
    <div v-for="(p, i) in content.people" :key="i" class="text-center">
      <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" loading="lazy" />
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
      <p v-if="p.childOrder" class="mt-1">{{ p.childOrder }}</p>
      <p v-if="p.parents" class="mt-1 whitespace-pre-line">{{ p.parents }}</p>
      <p v-if="p.address" class="mt-1 text-sm text-gray-600">{{ p.address }}</p>
      <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/couple-section.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/invitation/sections/CoupleSection.vue tests/components/couple-section.test.ts
git commit -m "feat: couple section renders the person photo"
```

---

## Task 7: Autosave reconcile (keystone layer 3) — loop-safe

**Files:**
- Create: `app/composables/useReconcile.ts`
- Modify: `app/pages/admin/invitations/[id]/edit.vue:24-30` (`save()`)
- Test: `tests/composables/reconcile.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/composables/reconcile.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { reconcileSections } from '../../app/composables/useReconcile'

const doc = (sections: any[]) => ({ sections })

describe('reconcileSections', () => {
  it('returns null when an edit landed mid-flight (current differs from sent)', () => {
    const current = doc([{ id: 'a' }, { id: 'b' }])
    const sent = JSON.stringify(doc([{ id: 'a' }])) // user added b after sending
    expect(reconcileSections(sent, current, [{ id: 'a' }])).toBeNull()
  })

  it('returns null when the server document is identical (prevents watcher loop)', () => {
    const current = doc([{ id: 'a' }])
    const sent = JSON.stringify(current)
    expect(reconcileSections(sent, current, [{ id: 'a' }])).toBeNull()
  })

  it('returns the server sections when the server dropped a bad item', () => {
    const current = doc([{ id: 'a' }, {}]) // {} is the bad item still in the store
    const sent = JSON.stringify(current)
    const server = [{ id: 'a' }] // server normalized it away
    expect(reconcileSections(sent, current, server)).toEqual(server)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/reconcile.test.ts`
Expected: FAIL — `useReconcile` does not exist.

- [ ] **Step 3: Implement the pure reconcile helper**

Create `app/composables/useReconcile.ts`:

```ts
// Decide whether the editor should adopt the server-normalized sections after a
// draft PATCH. Returns the sections to adopt, or null to leave the store as-is.
//
// Loop safety: edit.vue watches editor.doc deeply, so adopting fires the watcher
// and schedules another save. We adopt ONLY when the server result differs from
// what's in the store; an identical adopt is skipped, so the one extra save
// returns identical sections and the cycle converges instead of hanging.
export function reconcileSections(
  sentDocJson: string,
  currentDoc: { sections: unknown[] },
  serverSections: unknown[],
): unknown[] | null {
  // An edit landed during the request — let the pending debounce re-save/re-reconcile.
  if (JSON.stringify(currentDoc) !== sentDocJson) return null
  // Server normalized to the same thing — nothing to adopt (and adopting would loop).
  if (JSON.stringify(serverSections) === JSON.stringify(currentDoc.sections)) return null
  return serverSections
}
```

- [ ] **Step 4: Wire it into `save()`**

In `app/pages/admin/invitations/[id]/edit.vue`, add the import near the other composable imports:

```ts
import { reconcileSections } from '~/composables/useReconcile'
```

Replace `save()` (lines 24-30):

```ts
async function save() {
  saveState.value = 'saving'
  const sent = JSON.stringify(editor.doc)
  try {
    const res = await $fetch<{ ok: boolean; document: { sections: any[] } }>(`/api/admin/invitations/${id}/draft`, { method: 'PATCH', body: { document: editor.doc } })
    const adopt = reconcileSections(sent, editor.doc, res.document.sections)
    if (adopt) editor.doc.sections.splice(0, editor.doc.sections.length, ...adopt)
    saveState.value = 'saved'
  } catch { saveState.value = 'error' }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/composables/reconcile.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/composables/useReconcile.ts app/pages/admin/invitations/[id]/edit.vue tests/composables/reconcile.test.ts
git commit -m "fix: autosave adopts server-normalized draft without looping the watcher"
```

---

## Task 8: `mediaBelongsToInvitation` predicate

**Files:**
- Create: `server/utils/media-belongs.ts`
- Test: `tests/utils/media-belongs.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/utils/media-belongs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mediaBelongsToInvitation } from '../../server/utils/media-belongs'

const row = (over = {}) => ({ id: 'm1', type: 'audio', invitationId: 'inv1', ...over })

describe('mediaBelongsToInvitation', () => {
  it('accepts audio media owned by the invitation', () => {
    expect(mediaBelongsToInvitation(row(), 'inv1', 'audio')).toBe(true)
  })
  it('rejects another invitation\'s media', () => {
    expect(mediaBelongsToInvitation(row({ invitationId: 'other' }), 'inv1', 'audio')).toBe(false)
  })
  it('rejects the wrong kind', () => {
    expect(mediaBelongsToInvitation(row({ type: 'image' }), 'inv1', 'audio')).toBe(false)
  })
  it('rejects a missing row', () => {
    expect(mediaBelongsToInvitation(null, 'inv1', 'audio')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/media-belongs.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the predicate**

Create `server/utils/media-belongs.ts`:

```ts
// True iff `media` exists, is of the expected kind, and belongs to the invitation.
// Used to reject pointing an invitation's music at another invitation's (or the
// wrong type of) media before persisting musicMediaId.
export function mediaBelongsToInvitation(
  media: { id: string; type: string; invitationId: string } | null,
  invitationId: string,
  kind: string,
): boolean {
  return !!media && media.type === kind && media.invitationId === invitationId
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/media-belongs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/media-belongs.ts tests/utils/media-belongs.test.ts
git commit -m "feat: mediaBelongsToInvitation predicate for music-set validation"
```

---

## Task 9: `PATCH /api/admin/invitations/:id/music` endpoint

**Files:**
- Create: `server/api/admin/invitations/[id]/music.patch.ts`
- Test: none new (logic is the Task 8 predicate + the shared `assertOwnerOr404`, both already covered). Verified end-to-end in Task 13.

- [ ] **Step 1: Implement the endpoint**

Create `server/api/admin/invitations/[id]/music.patch.ts`:

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, media } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { mediaBelongsToInvitation } from '../../../../utils/media-belongs'

const body = z.object({ musicMediaId: z.string().uuid().nullable() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()

  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { musicMediaId } = parsed.data

  if (musicMediaId !== null) {
    const [m] = await db.select({ id: media.id, type: media.type, invitationId: media.invitationId })
      .from(media).where(eq(media.id, musicMediaId)).limit(1)
    if (!mediaBelongsToInvitation(m ?? null, id, 'audio')) {
      throw createError({ statusCode: 400, message: 'Invalid media' })
    }
  }

  await db.update(invitations).set({ musicMediaId, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, musicMediaId }
})
```

- [ ] **Step 2: Typecheck the new endpoint**

Run: `npx nuxt typecheck` (or `npx vue-tsc --noEmit` per the project's existing typecheck script — check `package.json`)
Expected: exit 0, no errors referencing `music.patch.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/invitations/[id]/music.patch.ts
git commit -m "feat: PATCH /music endpoint sets or clears the invitation track (owner + belongs guarded)"
```

---

## Task 10: Editor GET returns musicMediaId + musicUrl

**Files:**
- Modify: `server/api/admin/invitations/[id]/index.get.ts`
- Test: none new (thin DB read; covered by Task 13 typecheck + manual). The `musicUrl` resolution mirrors `loadInvitationBySlug`.

- [ ] **Step 1: Resolve and return the music fields**

In `server/api/admin/invitations/[id]/index.get.ts`, add `media` to the schema import and resolve the URL. Update the import (line 3):

```ts
import { invitations, themes, media } from '../../../../db/schema'
```

Add `and` to the drizzle import (line 1):

```ts
import { eq, and } from 'drizzle-orm'
```

Before the `return`, resolve the music URL:

```ts
  let musicUrl: string | null = null
  if (inv!.musicMediaId) {
    const [m] = await db.select({ url: media.url }).from(media)
      .where(and(eq(media.id, inv!.musicMediaId), eq(media.type, 'audio'))).limit(1)
    musicUrl = m?.url ?? null
  }
```

Extend the returned object:

```ts
  return {
    id: inv!.id, slug: inv!.slug, type: inv!.type, status: inv!.status,
    themeId: inv!.themeId, draftDocument: inv!.draftDocument,
    publishedAt: inv!.publishedAt, cssVars,
    musicMediaId: inv!.musicMediaId, musicUrl,
  }
```

- [ ] **Step 2: Typecheck**

Run the project's typecheck script.
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/invitations/[id]/index.get.ts
git commit -m "feat: editor GET resolves musicMediaId to musicUrl"
```

---

## Task 11: Invitation settings panel + music control, wired into the editor

**Files:**
- Create: `app/components/editor/InvitationSettings.vue`
- Modify: `app/pages/admin/invitations/[id]/edit.vue` (mount panel, hold `musicUrl` state)
- Test: `tests/components/invitation-settings.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/invitation-settings.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InvitationSettings from '../../app/components/editor/InvitationSettings.vue'

describe('InvitationSettings', () => {
  it('emits update:musicUrl with the uploaded url after the music upload', async () => {
    const w = mount(InvitationSettings, {
      props: { musicUrl: null, onSetMusic: vi.fn().mockResolvedValue(undefined) },
    })
    const uploader = w.findComponent({ name: 'MediaUploader' })
    uploader.vm.$emit('uploaded', { id: 'aud1', url: 'https://cdn/song.mp3' })
    await w.vm.$nextTick()
    await Promise.resolve()
    expect((w.props() as any).onSetMusic).toHaveBeenCalledWith('aud1')
    expect(w.emitted('update:musicUrl')![0][0]).toBe('https://cdn/song.mp3')
  })

  it('shows the current track + a remove button when musicUrl is set', () => {
    const w = mount(InvitationSettings, { props: { musicUrl: 'https://cdn/song.mp3', onSetMusic: vi.fn() } })
    expect(w.find('audio').attributes('src')).toBe('https://cdn/song.mp3')
    expect(w.find('button').exists()).toBe(true)
  })
})
```

> The panel takes an `onSetMusic(mediaId: string | null) => Promise<void>` callback prop (the page wires it to the PATCH call) so the component stays unit-testable without `$fetch`. It emits `update:musicUrl` so the preview updates immediately.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/invitation-settings.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the settings panel**

Create `app/components/editor/InvitationSettings.vue`:

```vue
<script setup lang="ts">
import MediaUploader from './MediaUploader.vue'
const props = defineProps<{ musicUrl: string | null; onSetMusic: (mediaId: string | null) => Promise<void> }>()
const emit = defineEmits<{ 'update:musicUrl': [string | null] }>()

async function onUploaded(media: { id: string; url: string }) {
  await props.onSetMusic(media.id)
  emit('update:musicUrl', media.url)
}
async function remove() {
  await props.onSetMusic(null)
  emit('update:musicUrl', null)
}
</script>
<template>
  <div class="rounded border p-3 text-sm">
    <h3 class="mb-2 font-medium text-gray-700">Pengaturan Undangan</h3>
    <span class="mb-1 block text-gray-600">Musik</span>
    <div v-if="musicUrl" class="mb-2 flex items-center gap-2">
      <audio :src="musicUrl" controls class="h-8" />
      <button type="button" class="text-xs text-red-600" @click="remove">Hapus musik</button>
    </div>
    <MediaUploader kind="audio" @uploaded="onUploaded" />
  </div>
</template>
```

- [ ] **Step 4: Mount it in the editor page + hold musicUrl state**

In `app/pages/admin/invitations/[id]/edit.vue`:

Add the import:

```ts
import InvitationSettings from '~/components/editor/InvitationSettings.vue'
```

After the `cssVars` line (~line 22), add the music state + setter:

```ts
const musicUrl = ref<string | null>((data.value as any).musicUrl ?? null)
async function setMusic(mediaId: string | null) {
  await $fetch(`/api/admin/invitations/${id}/music`, { method: 'PATCH', body: { musicMediaId: mediaId } })
}
```

In the template, put the panel above `SectionList` in the left column. Replace the `<SectionList ... />` block's surrounding so the left column is:

```vue
        <div class="space-y-4">
          <InvitationSettings v-model:music-url="musicUrl" :on-set-music="setMusic" />
          <SectionList
            :sections="editor.doc.sections"
            @add="editor.addSection"
            @remove="editor.remove"
            @toggle="editor.toggle"
            @move="(p) => editor.move(p.from, p.to)"
            @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
        </div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/invitation-settings.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/InvitationSettings.vue app/pages/admin/invitations/[id]/edit.vue tests/components/invitation-settings.test.ts
git commit -m "feat: invitation settings panel with music upload/remove"
```

---

## Task 12: EditorPreview plays the track on the cover

**Files:**
- Modify: `app/components/editor/EditorPreview.vue`
- Modify: `app/pages/admin/invitations/[id]/edit.vue` (pass `:music-url`)
- Test: `tests/components/editor-preview.test.ts` (add a case)

- [ ] **Step 1: Write the failing test**

Add to `tests/components/editor-preview.test.ts`:

```ts
  it('renders MusicPlayer when showing the cover with a musicUrl', () => {
    const w = mount(EditorPreview, { props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: true, musicUrl: 'https://cdn/song.mp3' } })
    expect(w.findComponent({ name: 'MusicPlayer' }).exists()).toBe(true)
  })
  it('does not render MusicPlayer without a musicUrl', () => {
    const w = mount(EditorPreview, { props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: true } })
    expect(w.findComponent({ name: 'MusicPlayer' }).exists()).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/editor-preview.test.ts`
Expected: FAIL — EditorPreview has no `musicUrl` prop / MusicPlayer.

- [ ] **Step 3: Add the prop + MusicPlayer**

In `app/components/editor/EditorPreview.vue`:

Add the import:

```ts
import MusicPlayer from '../invitation/MusicPlayer.vue'
```

Extend props (the `defineProps` object) with:

```ts
  musicUrl?: string | null
```

In the template, inside `[data-preview-frame]`, after `SectionRenderer`:

```vue
      <MusicPlayer v-if="showCover && musicUrl" :src="musicUrl" :playing="showCover" />
```

> MusicPlayer's fixed-position button is contained by the preview frame's `contain: layout paint` (same mechanism as the cover in 2a). Autoplay may be blocked until a user gesture in the preview — acceptable; the control still appears and the track plays on interaction.

- [ ] **Step 4: Pass `musicUrl` from the page**

In `app/pages/admin/invitations/[id]/edit.vue`, update the `<EditorPreview ... />` tag to add:

```vue
:music-url="musicUrl"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/editor-preview.test.ts`
Expected: PASS (existing 3 cases + 2 new).

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/EditorPreview.vue app/pages/admin/invitations/[id]/edit.vue tests/components/editor-preview.test.ts
git commit -m "feat: editor preview plays the music track on the cover"
```

---

## Task 13: Lower the published edge-cache window

**Files:**
- Modify: `server/api/invitations/[slug].get.ts:22`
- Test: `tests/api/invitation-route.test.ts` (update if it asserts on the cache header; otherwise none)

- [ ] **Step 1: Check whether a test asserts the cache value**

Run: `grep -n "s-maxage\|Cache-Control\|max-age" tests/api/invitation-route.test.ts`
- If it asserts `s-maxage=300`, update that assertion to `s-maxage=60` first (TDD: make it expect the new value, watch it fail).
- If no assertion exists, proceed to Step 2 (one-line change).

- [ ] **Step 2: Lower s-maxage to 60**

`server/api/invitations/[slug].get.ts`, line 22 (the published branch):

```ts
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600')
```

- [ ] **Step 3: Run the route test**

Run: `npx vitest run tests/api/invitation-route.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/api/invitations/[slug].get.ts tests/api/invitation-route.test.ts
git commit -m "perf: lower published edge cache s-maxage to 60s"
```

---

## Task 14: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all tests pass (≥ 74 prior + the new ones added across Tasks 1-13). Zero failures.

- [ ] **Step 2: Typecheck**

Run the project's typecheck script (check `package.json` `scripts` — likely `npm run typecheck` → `nuxt typecheck`).
Expected: exit 0, no type errors. Pay attention to any consumer of the old `photoMediaId` / `mediaId`-as-string shapes; all such references were updated in Tasks 3-6.

- [ ] **Step 3: Grep for stragglers from the shape change**

Run:
```bash
grep -rn "photoMediaId" app/ server/ tests/
grep -rn "item.mediaId" app/components/invitation/
grep -rn "uploaded: \[string\]\|onUploaded(id: string)" app/
```
Expected: no results (every reference migrated to the new `{ mediaId, url }` / `{ id, url }` shapes).

- [ ] **Step 4: Final commit if any straggler fix was needed**

```bash
git add -A && git commit -m "chore: finalize phase 2b-media media wiring"
```

(Skip if Step 3 found nothing and the working tree is already clean.)

---

## Self-Review (done at write time)

- **Spec §3 (gallery data-loss fix, 3 layers):** Task 1 (resilient schema), Task 2 (defaultItem), Task 7 (reconcile). ✅
- **Spec §3.1/§3.2 (image shape + registry):** Tasks 1, 3 (gallery item `{mediaId,url}`, person `photo`, descriptors, `fieldTypes.image`). ✅
- **Spec §4 (rendering):** Task 4 (ImageControl), Task 5 (GallerySection), Task 6 (CoupleSection). ✅
- **Spec §5 (music):** Task 8 (predicate), Task 9 (PATCH /music), Task 10 (GET musicUrl), Task 11 (settings panel), Task 12 (preview MusicPlayer). ✅
- **Spec §6 (cache):** Task 13. ✅
- **Spec §7 (testing):** pure units (Tasks 1, 2, 3, 8), components (4, 5, 6, 11, 12), reconcile (7); endpoint /music belongs+owner covered by the Task 8 predicate test + shared ownership test (no Nitro harness exists, matching the codebase's pure-core/thin-shell pattern). ✅
- **Spec §9 success criteria 1-7:** 1→T1+T2+T4, 2→T6, 3→T4/T5/T6, 4→T8-T12, 5→T1+T7, 6→T13, 7→T8+T9. ✅
- **Deviation flagged:** youtube gallery items made lenient (default-'' videoId, render-time skip) rather than strict-drop — serves the "never silently lose edits" goal. Documented in the header.
- **Type consistency:** `{ mediaId, url }` (image content), `{ id, url }` (MediaUploader emit / media POST response), `reconcileSections(sentDocJson, currentDoc, serverSections)`, `mediaBelongsToInvitation(media, invitationId, kind)`, `onSetMusic(mediaId|null)` used identically across tasks. ✅
- **No migration:** `music_media_id` column exists; photo/gallery in JSONB; seed has no photos (verified). ✅
```

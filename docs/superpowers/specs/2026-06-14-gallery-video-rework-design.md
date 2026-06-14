# Lovree v3 — Design Spec: Gallery & Video Rework

- **Date:** 2026-06-14
- **Status:** Approved for planning
- **Builds on:** Phase 2b-media (gallery items), 2b-fields (section registry pattern). Same branch `feat/phase-2b-media`.
- **Scope:** Make the gallery **photos-only** with **multi-upload** and **up/down reorder** (via a dedicated `GalleryControl`), and add a separate **Video (YouTube)** section. (Subsystem B of the media rework; the music library was Subsystem A.)

## 1. Background & Goal

The gallery currently mixes images and YouTube items in one list, edited through the generic `ListControl` (the user types `"image"`/`"youtube"` into a text field — clunky), uploads one image at a time, and offers no reordering. 

**Goal:** Gallery is a clean photo grid the customer fills by uploading several images at once, reorders with ↑/↓, and removes individually; YouTube videos move to their own dedicated section.

## 2. Decisions carried in from brainstorming

- **Gallery = images only.** YouTube is removed from the gallery.
- **Gallery item shape simplifies to flat** `{ mediaId: string, url: string }` (drop the `image: { … }` nesting introduced for the generic image control).
- **Dedicated `GalleryControl`** (a new `'gallery'` field type) replaces the generic list editing for the gallery: thumbnail grid, multi-file upload, per-item remove, and **↑/↓ reorder** (no drag — buttons, mobile-safe).
- **New `video` section** holds YouTube videos, edited with the existing generic `ListControl` + youtube control.
- **No migration** (JSONB). Old gallery YouTube items are dropped by the new image-only schema (resilient parse); demo gallery is empty; dev DB disposable.

## 3. Schema changes (`server/registry/field-types.ts` + `sections.ts`)

`field-types.ts`:
- Add a flat, resilient gallery image array:
```ts
export const galleryImage = z.object({ mediaId: z.string().default(''), url: z.string().default('') })
export const galleryImages = z
  .array(galleryImage.catch(undefined as any))
  .transform((a) => a.filter(Boolean))
  .default([])
```
  (Replaces the `galleryImageItem`/`galleryYoutubeItem`/`galleryItems` union for the gallery. Keep `youtubeId` for the video section.)
- Extend `fieldTypes` with `gallery: z.array(z.object({ mediaId: z.string().default(''), url: z.string().default('') }))` (key parity for the editor registry).

`sections.ts`:
- `gallerySchema = z.object({ items: galleryImages })`.
- Gallery registry entry's `fields`: replace the `items` list descriptor with `items: { type: 'gallery' as const, label: 'Foto' }`.
- Add `'gallery'` to the `FieldType` union (`type FieldType = … | 'gallery'`).
- Add a `video` section (see §5).

## 4. GalleryControl (`app/components/editor/controls/GalleryControl.vue`)

- Props: `modelValue: { mediaId: string; url: string }[]`, `label?`. Emits `update:modelValue`.
- **Multi-upload:** a file input `accept="image/png,image/jpeg,image/webp" multiple`. On change, for each selected file: POST `multipart` to `/api/admin/media` (`invitationId` from `inject('invitationId')`, `kind: 'image'`, `file`) → append `{ mediaId: res.id, url: res.url }`. Show an uploading indicator; surface an error if any upload fails (continue the rest).
- **Grid:** thumbnails (`<img :src="item.url">`); each tile has a **×** remove and **↑/↓** move buttons (move clamps at ends). Reorder/remove emit the new array.
- Wired via a new `'gallery'` entry in `FieldEditor.vue`'s control map (`gallery: GalleryControl`).

The single-image `ImageControl` (used by the couple photo) is unchanged.

## 5. Video section

`field-types.ts`/`sections.ts`:
- `videoItem = z.object({ videoId: z.string().default('') })`; `videoSchema = z.object({ videos: z.array(videoItem).default([]) })`.
- Registry `video`:
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
  (Reuses the generic `ListControl` + youtube control — add/remove rows; reorder of videos is out of scope.)
- Component `app/components/invitation/sections/VideoSection.vue`: render a `YouTubeEmbed` for each `videoId` matching the 11-char id pattern (skip invalid/empty). Register `video: VideoSection` in `sectionComponents.ts`.
- `video` joins `SECTION_TYPES` automatically → appears as a "+ Video" add button; the `section-map-alignment` test enforces the component mapping.

## 6. GallerySection render

`app/components/invitation/sections/GallerySection.vue`: images-only. `props.content.items: { mediaId, url }[]`; render `<img :src="item.url" loading="lazy">` for each item with a non-empty `url`; drop the YouTube branch.

## 7. Testing

- **Pure:** `validateContent('gallery', { items: [{mediaId,url}, {}, {bogus}] })` keeps valid image items, drops bad ones, never resets; a legacy item with a `youtube` shape is dropped. `validateContent('video', …)` defaults `{ videos: [] }` and preserves `{ videoId }` rows.
- **Component:** `GalleryControl` — uploading appends items (mock `$fetch`), remove drops one, ↑/↓ reorder emits the swapped order, thumbnails render. `GallerySection` renders `<img>` per image and no `YouTubeEmbed`. `VideoSection` renders a `YouTubeEmbed` per valid id and skips invalid. `FieldEditor` maps `'gallery'` → `GalleryControl`.
- **Alignment:** `section-map-alignment` passes once `video` has a component.
- Full suite stays green; typecheck clean.

## 8. Out of Scope

- Drag-and-drop reorder (buttons only); reordering videos.
- Image optimization / `@nuxt/image` (separate Phase 4 item).
- A data migration moving old gallery YouTube items into the new Video section (they are simply dropped; dev DB disposable).
- Captions/alt text per image.

## 9. Success Criteria

1. The gallery is photos-only: the customer uploads multiple images at once, sees thumbnails, removes individually, and reorders with ↑/↓; the live preview and published invitation show the photos in that order.
2. A new "Video" section lets the customer add several YouTube IDs that render as embeds.
3. The gallery no longer accepts YouTube; videos live in their own section.
4. Adding a gallery photo or a video never wipes the section (resilient per-item validation, consistent with the earlier gallery data-loss fix).

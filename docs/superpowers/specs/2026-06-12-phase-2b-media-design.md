# Lovree v3 — Design Spec: Phase 2b-media (Media Completion)

- **Date:** 2026-06-12
- **Status:** Approved for planning
- **Builds on:** Phase 0+1 (renderer) and Phase 2a (editor). Same branch `feat/foundation-renderer`.
- **Scope:** Make uploaded media actually usable in real invitations — resolve gallery + couple-photo images to URLs, wire audio to the invitation's music track, and tighten the publish edge-cache window. Fixes a latent gallery-editing data-loss bug surfaced by image editing. Custom generic fields + design-token override authoring remain **Phase 2b-customization** (separate spec).

## 1. Background & Goal

Phase 2a shipped the editor, but two media paths are unusable for a real (non-demo) invitation:
- **Images:** gallery items and couple photos store a `mediaId` (or nothing), and `GallerySection` renders the raw `mediaId` as an `<img src>` (broken); `CoupleSection` renders no photo at all.
- **Audio:** uploads succeed and create a `media` row, but nothing sets `invitations.musicMediaId`, so an uploaded track is never played.

This spec closes those gaps and fixes a **latent gallery data-loss bug** that becomes user-visible the moment someone adds a gallery item.

**Goal:** A customer can add gallery photos and a couple photo (visible in the live preview and the published invitation), set the invitation's music in a settings panel, and never silently lose gallery edits.

## 2. Decisions carried in from brainstorming

- **Image storage:** store `{ mediaId, url }` in content at pick-time (read-optimized; R2 public URLs are stable; `mediaId` kept for management). No read-time media join.
- **Rendering:** plain `<img :src="...url">` (no `@nuxt/image` provider configuration).
- **Music:** invitation-level setting (one track, plays on cover open), set via a "Pengaturan Undangan" (invitation settings) panel in the editor — not a section.
- **Cache:** lower `s-maxage`; document a proper edge purge as deploy-time config (don't build a purge system now).

## 3. Keystone: Gallery-item data model + the data-loss fix

**The bug (present now, exposed by image editing):**
1. `ListControl.add()` pushes an empty `{}` list item.
2. `galleryItem` is a `z.discriminatedUnion('type', […])`; `{}` has no `type` discriminant → invalid.
3. `validateContent` does `safeParse`; on **any** failure it returns `schema.parse({})` — full defaults for the **whole section**.
4. Autosave runs `validateDraftDocument` → `validateContent` on every save.

Net effect: open a gallery → click "+ Tambah" → ~1.5s later autosave validates → the `{}` item fails the union → **the entire gallery is reset to `{ items: [] }` server-side**, invisibly (the client store still shows the item; the loss surfaces on reload or publish). Only the gallery breaks this way — other list item schemas (couple/event/info) default every field, so `{}` parses fine.

**Three-layer fix:**

1. **Type-correct default items.** Add an optional `defaultItem` to the `list` field descriptor. `ListControl.add()` pushes `descriptor.defaultItem ?? {}`. The gallery descriptor sets `defaultItem = { type: 'image', mediaId: '', url: '' }`, so a new item is union-valid from the start. (Lists whose items default cleanly keep `{}`.)

2. **Lenient item schema + resilient array.** The gallery image variant becomes `{ type: z.literal('image'), mediaId: z.string().default(''), url: z.string().default('') }`. The items array drops bad items instead of failing the section:
   ```ts
   items: z.array(z.union([imageItem, youtubeItem]).catch(undefined as any))
            .transform((a) => a.filter(Boolean))
            .default([])
   ```
   So one malformed item is dropped; the rest of the gallery survives. (This replaces the bare `discriminatedUnion` for the gallery items only; other sections unchanged.)

3. **Autosave reconciliation.** `PATCH /draft` already returns the normalized `{ document }`. The editor's `save()` adopts the returned document into the store **when it is structurally newer than the last sent snapshot and no edit is in flight** — concretely: after a successful PATCH whose request payload equals the current `editor.doc` (no edits since), replace `editor.doc.sections` with the server's normalized sections. This prevents silent client/server divergence (a dropped item disappears from the UI immediately rather than at the next reload). If an edit landed during the request, skip reconciliation (the pending debounce will re-save and re-reconcile).

### 3.1 Image storage shape

- **Gallery item (image):** `{ type: 'image', mediaId: string, url: string }`. YouTube item unchanged: `{ type: 'youtube', videoId }`.
- **Couple person:** replace `photoMediaId: uuid|null` with `photo: { mediaId: string, url: string }` (default `{ mediaId: '', url: '' }`).
- The generic `image` field type now holds an object `{ mediaId, url }` (was a bare uuid). The field descriptor type stays `'image'`; the control handles the object.

### 3.2 Registry schema changes

In `server/registry/sections.ts`:
- `personSchema`: `photoMediaId` → `photo: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' })`.
- `gallerySchema.items`: the resilient array above; image variant gains `url`.
- Field descriptors: gallery `items` descriptor gains `defaultItem`; couple `people` itemFields `photoMediaId` → `photo` (type `image`).

No data migration needed: the demo gallery is empty and demo couple has no photos; `validateContent` fills defaults for the new shape.

## 4. Image rendering

- **`GallerySection.vue`:** image items render `<img :src="item.url" loading="lazy" class="… object-cover">` (plain `<img>`, not `NuxtImg`). YouTube items unchanged. (Currently renders `item.mediaId` as src — the break being fixed.)
- **`CoupleSection.vue`:** **new render path** — when `person.photo?.url` is set, render `<img :src="person.photo.url">` above the name. Today the photo field is ignored entirely.
- **`ImageControl.vue`:** `MediaUploader` returns `{ id, url }`; ImageControl stores `{ mediaId: id, url }` (object) via `update:modelValue` and shows a small thumbnail from `url`. Empty value renders just the uploader.

## 5. Music (invitation settings)

- **UI:** an "Pengaturan Undangan" panel in the editor (left column, separate from the section list — e.g. an accordion/section above SectionList). Phase 2b-media populates it with a **Music control**: `MediaUploader kind="audio"` → on upload, call the music endpoint; show the current track + a remove button. (Phase 2b-customization later adds token overrides to this same panel.)
- **New endpoint `PATCH /api/admin/invitations/:id/music`:**
  - Body `{ musicMediaId: string | null }`.
  - `assertOwnerOr404` (owner check, 404 on mismatch).
  - **Media-belongs validation:** when `musicMediaId` is non-null, verify a `media` row exists with `id = musicMediaId`, `type = 'audio'`, AND `invitationId = :id`; else 400. `null` clears the track (allowed). This is a pure predicate `mediaBelongsToInvitation(media, invitationId, kind)` for testability.
  - Update `invitations.musicMediaId`.
- **URL resolution for the editor/preview:** the editor GET (`/api/admin/invitations/:id`) adds `musicMediaId` + resolved `musicUrl` to its response so the panel shows the active track and the cover preview can play it.
- **`EditorPreview`:** accepts an optional `musicUrl`; when previewing the cover (`showCover`), renders `MusicPlayer` so the editor can hear the track (completes the cover-in-preview from 2a).
- **Public renderer:** `loadInvitationBySlug` already resolves `musicMediaId → musicUrl` (Phase 1, unchanged). This path finally has a way to be set.

## 6. Cache window

- Lower the published public-route cache header from `s-maxage=300` to `s-maxage=60` (edge stale window ≤ 1 min; still caches bursty traffic). One-line change in `server/api/invitations/[slug].get.ts`. The `published_at`-keyed ETag continues to give browser conditional-GET revalidation.
- Document a proper edge purge (Vercel cache-tag header + on-demand purge API on publish) as a deploy-time follow-up — not built here.

## 7. Testing

- **Pure units:** gallery resilient validation (`validateContent('gallery', { items: [valid, {}, brokenItem] })` keeps only valid items, section not reset); `ListControl` default-item factory (gallery `add()` produces a type-correct item); `mediaBelongsToInvitation(media, invId, 'audio')` predicate.
- **Components:** ImageControl stores `{ mediaId, url }` + shows a thumbnail; GallerySection renders `<img>` for image items and `<YouTubeEmbed>` for youtube; CoupleSection renders a photo when `photo.url` is set; the music control uploads and calls the endpoint.
- **Endpoints:** `PATCH /music` — owner check + media-belongs validation (reject another invitation's media → 400; reject non-audio → 400; accept null).
- **Reconcile:** autosave adopts the server-normalized document when no edit is in flight.

## 8. Out of Scope (this spec)

- Custom generic fields (`field_overrides` authoring) — Phase 2b-customization
- Design-token override UI (colors/fonts) — Phase 2b-customization (shares the settings panel)
- Platform-specific edge cache purge system — deploy-time follow-up
- Image optimization/transforms / `@nuxt/image` provider — later (plain `<img>` for now)
- Guest management — Phase 2c; RSVP — Phase 3

## 9. Success Criteria

1. Adding a gallery item does **not** reset the gallery (the data-loss bug is fixed); uploading an image shows it in the item and the live preview.
2. A couple photo, once set, renders in `CoupleSection` (preview + published).
3. Gallery and couple images render via stored `url` (no broken `<img>`, no read-time media join).
4. Uploading audio in the settings panel sets `musicMediaId` (only audio media belonging to that invitation is accepted) and the music plays on the cover (editor preview + public `/u/:slug`).
5. A malformed gallery item is dropped per-item; the section is not wiped; the client store and server document do not silently diverge (autosave reconciles).
6. After publish, an edge cache serves stale content for at most ~60s; browser revalidates immediately via the `published_at` ETag.
7. A non-owner calling `PATCH /music` (or any admin mutation) gets 404; pointing music at another invitation's media is rejected.

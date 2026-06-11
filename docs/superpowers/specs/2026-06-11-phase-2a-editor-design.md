# Lovree v3 — Design Spec: Phase 2a (Core Editor)

- **Date:** 2026-06-11
- **Status:** Approved for planning
- **Builds on:** Phase 0+1 (`2026-06-11-lovree-v3-foundation-renderer-design.md`)
- **Scope of this spec:** Phase 2a only — the form-based editor with live preview, media upload, draft autosave, publish, and structural section editing (on/off, reorder, add/remove). Custom generic fields + token-override authoring are **Phase 2b**; guest management is **Phase 2c**; RSVP write path + live guestbook are **Phase 3**.

## 1. Background & Goal

Phase 0+1 made an invitation renderable from data: a section registry (Zod schemas), design-token resolver, and a public renderer at `/u/:slug`. Phase 2a gives the **owner an editor** to build and change that invitation themselves, with a Wix-like live preview — eliminating the old workflow where customization meant editing theme code.

**Goal:** An authenticated owner can create an invitation, edit each section's content with an instant live preview, upload photos and music, toggle/reorder/add/remove sections, autosave to a working draft, and explicitly **Publish** to make the changes visible to guests.

This introduces the product's first **write** surface, so two cross-cutting concerns become mandatory: **ownership authorization** on every mutation, and **cache invalidation** on publish.

## 2. Decisions carried in from brainstorming

- **Live preview:** same-page reactive (editor and preview in one Nuxt app sharing reactive state). Mobile/desktop preview toggle.
- **Save model:** continuous **autosave to a draft**, with a separate explicit **Publish** that makes the draft live. (Supersedes the Phase 0+1 "edit live-on-save" note.)
- **Media upload:** server-proxied (`POST /api/admin/media`); image ≤ 2 MB (jpg/png/webp), audio ≤ 5 MB (mp3).
- **Reorder:** form-based (up/down move). Drag-and-drop is Phase 4.
- **Field editing:** **preset** fields only (driven by the registry). Custom generic fields are Phase 2b.

## 3. Keystone: Data Model — Draft / Publish

Phase 2a includes **structural** editing (section on/off, reorder, add/remove), so the draft must capture the **entire section structure**, not just field values. Sections are never read or written independently of their invitation (no cross-invitation section query; nothing FKs to a section id — `rsvps`/`guests` key off the invitation), so the normalized `sections` table earns nothing for a whole-document autosave editor.

**Decision: retire the `sections` table; store two JSONB documents on `invitations`.**

```
invitations  (changes)
  - drop:  the separate `sections` table
  + add:   draft_document      jsonb  not null default '{"sections":[]}'
  + add:   published_document   jsonb            -- null until first publish
  + add:   published_at         timestamptz      -- null until first publish
  - keep:  status (draft|published) — a real column, set to 'published' by the publish
           operation; `published_document IS NOT NULL` always agrees with status = 'published'
```

Document shape (both draft and published):

```jsonc
{
  "sections": [
    { "id": "uuid-or-nanoid", "type": "hero", "enabled": true, "content": { /* validated by registry */ } },
    { "id": "...",            "type": "gallery", "enabled": true, "content": { "items": [ ... ] } }
    // repeats allowed (two galleries, etc.); array order = render order
  ]
}
```

- Each section instance carries a stable client-generated `id` (nanoid) so the editor can key list operations (reorder/remove) reliably — this id is internal to the document and nothing references it across tables.
- **Editor** reads/writes `draft_document` (one reactive document).
- **Public renderer** reads `published_document`.
- **Publish** = `published_document = draft_document` (replace-all; safe because nothing references section ids), set `published_at = now()`, and invalidate cache (§7).

### 3.1 Impact on Phase 0+1 (bounded)

- `validateContent`, token resolution (`resolveTokens`/`tokensToCssVars`), and the section→component rendering all **carry over unchanged**.
- `assembleInvitation` changes its **source**: instead of receiving section *rows*, it receives the `published_document.sections` array (already ordered; filter `enabled`, validate each `content`). Its signature simplifies to `(inv, theme, sections[])` where `sections` comes from the document.
- `loadInvitationBySlug` reads `published_document` (returns null/404 if the invitation has never been published and the viewer is not the owner; the owner can preview an unpublished invitation via the editor, not the public route).
- **Migration:** drop `sections` table; add the three columns. Update the seed to write `draft_document` + `published_document`. Adapt the Phase 0+1 loader/assembly tests (the section data now comes from a JSON array, not rows) — they adapt rather than disappear.

## 4. Editor Architecture & Live Preview

Route: `/admin/invitations/:id/edit` (gated by the `admin` middleware + ownership check in the loader).

Two-column layout: **edit panel** (left) and **preview** (right).

- **Reactive document store:** the editor loads `draft_document` into a reactive store (Pinia or a `reactive()` composable) as a single editable document. All edits mutate the store; the preview, fed from the same store, re-renders instantly.
- **Preview pane:** renders the production `<SectionRenderer>` over the store's sections. Design tokens are scoped to the preview container (CSS vars set on the preview wrapper, not globally) so the editor's own chrome is unaffected.
- **Fixed-position containment (required):** `CoverModal` is `fixed inset-0` and `MusicPlayer` is `fixed`. In an in-page preview pane these would escape and cover the editor. The preview wrapper MUST establish a containing block for fixed descendants via `transform: translateZ(0)` (or `contain: layout paint`) so `position: fixed` resolves relative to the wrapper. The spec calls this out explicitly; without it the cover overlays the whole editor.
- **Mobile/desktop toggle:** the preview wrapper constrains width — mobile ≈ 390px (phone frame), desktop full. The toggle swaps a width class only.
- **Cover/content toggle:** the preview offers a "show cover / show content" switch (default: content), so the editor isn't forced through the cover gate on every change.

### 4.1 Pure core / thin shell (preserve Phase 0+1 testability)

Stateful UI sits on tested pure functions:
- `assertOwner(invitation, userId): boolean`
- `validateDraftDocument(doc): { ok; doc }` — validates each section type against the registry, fills defaults, drops unknown types.
- `autosaveDebounce` — debounce scheduler (pure/timer-injectable).
- `draftToPublished(draftDoc): publishedDoc` — the publish mapping (currently identity/clone; isolated so future transforms have one home).
- `validateMediaUpload({ size, bytes, kind }): { ok; error? }` — size + magic-byte check.
- `deriveFieldEditors(sectionType): FieldEditor[]` — registry → form-control descriptors.

## 5. Section / Field Editing

### 5.1 Field editing (content)

The edit panel renders form controls **driven by the registry**. The registry's per-section entry gains a **field descriptor** map alongside `schema` + `label`:

```ts
sectionRegistry.hero = {
  schema, label: 'Hero',
  fields: {
    title:      { type: 'text',     label: 'Judul' },
    coupleName: { type: 'text',     label: 'Nama Pasangan' },
    date:       { type: 'date',     label: 'Tanggal' },
  },
}
```

Field type → control mapping:
- `text` → text input
- `longtext` → textarea
- `date` → date/datetime picker
- `image` → **media picker** (opens uploader / media library; stores a media id)
- `youtube` → text input for a video id
- `url` → url input (validated http(s))
- `list` → **repeater** (add / remove / move items) for nested object arrays (events, people/couple, banks, socials, gallery items)

Only **preset** fields are editable here; custom generic fields are Phase 2b. All content remains validated by `validateContent`.

### 5.2 Structural editing (the `sections` array in `draft_document`)

- **Add section:** pick a type from the catalog (repeats allowed); the new instance gets a generated `id` and the registry's `defaultContent(type)`.
- **Remove section:** delete the instance by `id`.
- **Toggle on/off:** set the instance's `enabled` flag.
- **Reorder:** up/down move buttons reorder the array (drag is Phase 4).

Every operation mutates the store → autosave → preview updates.

## 6. Endpoints

All under `/api/admin/*`; every one requires a session AND an ownership check (`session.user.id === invitation.ownerId`, else 404).

```
GET   /api/admin/invitations              list invitations owned by the session user
POST  /api/admin/invitations              create (choose type + theme); seeds an empty draft_document
GET   /api/admin/invitations/:id          fetch draft_document for the editor (owner only)
PATCH /api/admin/invitations/:id/draft    autosave: validate + persist the full draft_document
POST  /api/admin/invitations/:id/publish  published_document = draft_document; set published_at; invalidate cache
POST  /api/admin/media                    multipart upload → R2 → media row; returns { id, url }
```

### 6.1 Autosave (`PATCH .../draft`)

- Editor mutates store → debounce ≈ 1.5 s idle → PATCH sends the full `draft_document`.
- Server validates each section's `content` against the registry (`validateDraftDocument`), persists, returns the normalized document.
- UI shows "Menyimpan… / Tersimpan" status. On failure, surface a retry; do not silently drop edits.

### 6.2 Publish (`POST .../publish`)

- Copy `draft_document` → `published_document`, set `published_at`, set `status = 'published'`.
- **Invalidate cache (in scope now):** the public response carries `s-maxage=300`; without invalidation, published edits lag up to 5 minutes. Include `published_at` (or a version counter) in the invitation's cache key / `ETag` so a publish immediately changes the cached representation. The public route sets `ETag` from `published_at`; clients/CDN revalidate on change.

## 7. Media Upload (server-proxied)

`POST /api/admin/media` (owner-checked, multipart):
- **Enforce size before buffering the whole body:** image ≤ 2 MB, audio ≤ 5 MB.
- **Sniff magic bytes** (not just declared content-type / extension): jpg/png/webp for images, mp3 for audio.
- **Server-generated R2 key**, scoped to `invitations/:id/<kind>/<nanoid>.<ext>` — never trust a client-supplied key or filename.
- Upload via the existing `StorageAdapter.put`, insert a `media` row, return `{ id, url }`.
- `validateMediaUpload` (size + magic bytes) is a pure function.

## 8. Security (new write surface)

- **Ownership on every mutation:** create is implicitly owned by the session user; all `:id` routes and media uploads verify `session.user.id === invitation.ownerId` and return **404** (not 403) on mismatch, so existence isn't leaked.
- Autosave validates content server-side against the registry — a client cannot inject unknown section types or malformed content.
- Media: size cap enforced pre-buffer; magic-byte sniff; server-side keys.
- Reuse the hardened auth from Phase 0+1 (session via nuxt-auth-utils).

## 9. Out of Scope (this spec)

- Custom generic fields authoring (`field_overrides`) — Phase 2b
- Design-token override UI (colors/fonts) — Phase 2b
- Guest management (CRUD + `?guest=` link generation) — Phase 2c
- RSVP submission + live guestbook data — Phase 3
- Drag-and-drop reorder, additional themes, remaining invitation types beyond rendering — Phase 4
- Presigned direct-to-R2 uploads, image optimization/transform provider — later

## 10. Success Criteria

1. An owner can create an invitation (type + theme) and is taken to the editor with an empty draft.
2. Editing any section's preset fields updates the live preview instantly; the cover and music player render **inside** the preview pane (fixed-position containment works) and the mobile/desktop toggle constrains width.
3. Uploading an image (≤ 2 MB jpg/png/webp) and audio (≤ 5 MB mp3) stores them in R2 and makes them usable in the editor; oversized or wrong-type files are rejected with a clear error (verified by magic-byte sniff, not just extension).
4. The owner can add (incl. repeats), remove, toggle on/off, and reorder sections; all reflected in the preview.
5. Edits autosave to `draft_document` (debounced) with a visible save status; reloading the editor restores the draft.
6. Publish copies the draft to `published_document`; the public `/u/:slug` immediately reflects the published version (cache key keyed on `published_at`), while further draft edits do not change the public view until the next publish.
7. A non-owner (or unauthenticated user) calling any `/api/admin/*` mutation for an invitation they don't own receives 404; no cross-owner edit is possible.
8. The Phase 0+1 public renderer still works end-to-end against `published_document` (migrated from the `sections` table) with the existing token/section/registry behavior intact.

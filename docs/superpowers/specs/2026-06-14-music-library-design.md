# Lovree v3 — Design Spec: Music Library (per-user, reusable tracks)

- **Date:** 2026-06-14
- **Status:** Approved for planning
- **Builds on:** Phase 2b-media (per-invitation music upload). Same branch `feat/phase-2b-media`.
- **Scope:** Replace per-invitation audio upload with a per-user music library: a sidebar "Musik" page to upload/rename/delete tracks once, and an editor dropdown to pick a library track for an invitation. One track is reusable across many invitations. Decouples music from the `media` table. (Subsystem A of the music/gallery rework; the gallery/video rework is a separate spec.)

## 1. Background & Goal

Today music is a `media` row (`type='audio'`, `invitationId` NOT NULL) and `invitations.musicMediaId` points at it; `InvitationSettings` uploads a fresh file per invitation. That forces re-uploading the same song for every invitation and ties a track to one invitation. 

**Goal:** A customer uploads each song once into a personal library, then picks from that library when editing any invitation. Library management (upload, rename, delete) lives in a dedicated sidebar page; the editor just selects.

## 2. Decisions carried in from brainstorming

- **Per-user library** (owner-scoped), not a global/curated set — the customer manages their own tracks.
- **New `music_tracks` table**, decoupled from invitations and from the `media` table (which stays image/per-invitation). `invitations` references a track by id.
- **Dev DB is disposable:** drop `invitations.musicMediaId`, add `musicTrackId` — no data migration.
- **Delete a track in use:** null `musicTrackId` on any of the owner's invitations referencing it, delete the R2 object, then delete the row (the R2 adapter has `delete(key)`).
- Track **name** is user-provided on upload (default to the filename) and renameable.

## 3. Schema (migration 0005)

New table:
```ts
export const musicTracks = pgTable('music_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```
`invitations`: remove `musicMediaId`; add `musicTrackId: uuid('music_track_id').references(() => musicTracks.id)` (nullable). Generate migration `0005` via `drizzle-kit`. (Define `musicTracks` before `invitations`, or use a lazy ref, so the FK resolves.)

## 4. Pure utility

`server/utils/belongs.ts` — add (next to `rowBelongsToInvitation`):
```ts
export function rowBelongsToOwner(row: { ownerId: string } | null, ownerId: string): boolean {
  return !!row && row.ownerId === ownerId
}
```

## 5. Music-library endpoints (owner-scoped)

Under `server/api/admin/music`. Auth: `session.user?.id` else 401.

- **`GET /api/admin/music`** → `{ tracks: [{ id, name, url }] }` for the user, newest first.
- **`POST /api/admin/music`** (multipart `file` + optional `name`): pre-buffer size cap (reuse the 6MB content-length guard pattern); `validateMediaUpload({ kind:'audio', … })` (magic-byte sniff + 5MB cap); R2 `put('music/{ownerId}/{nanoid}.{ext}', …)`; insert `musicTracks { ownerId, name: name||'Tanpa Judul', r2Key, url }`; return `{ id, name, url }`.
- **`PATCH /api/admin/music/:id`** body `{ name: string (min 1, max 120) }`: load the track; `rowBelongsToOwner(track, userId)` else 404; update `name`; return `{ ok: true }`.
- **`DELETE /api/admin/music/:id`**: load the track; `rowBelongsToOwner` else 404; `db.update(invitations).set({ musicTrackId: null }).where(and(eq(musicTrackId, id), eq(ownerId, userId)))`; R2 `delete(track.r2Key)` (best-effort, ignore failure); delete the track row; return `{ ok: true }`.

## 6. Invitation ↔ track selection

- **`PATCH /api/admin/invitations/:id/music`** — change the body to `{ musicTrackId: uuid | null }`. `assertOwnerOr404` on the invitation. When non-null: load the track and verify `rowBelongsToOwner(track, session.user.id)` else 400. Set `invitations.musicTrackId`. Returns `{ ok: true, musicTrackId }`. (Replaces the old `musicMediaId` + `mediaBelongsToInvitation` logic.)
- **Editor GET** (`server/api/admin/invitations/[id]/index.get.ts`): resolve `musicTrackId → musicTracks.url`; return `musicTrackId` + `musicUrl` (replacing the prior `musicMediaId`/media resolution).
- **`InvitationSettings.vue`:** replace the audio `MediaUploader` with a **track dropdown** — load `GET /api/admin/music`, show the user's tracks + a "— tanpa musik —" option; on change call the existing `onSetMusic(trackId | null)` callback (its signature stays `(id|null) => Promise`), which the editor wires to `PATCH …/music { musicTrackId }`; show an `<audio>` preview of the selected track. The editor passes the current `musicTrackId` + `musicUrl` to preselect/preview.

## 7. Sidebar "Musik" page

- **Nav:** add a "Musik" item (`i-lucide-music`, `/admin/music`) to the admin sidebar (`app/layouts/admin.vue`) nav list.
- **Page `app/pages/admin/music.vue`** (admin layout): 
  - Upload: a file input (`accept="audio/mpeg"`) + an optional name input → `POST /api/admin/music` (multipart) → refresh list.
  - List: each track as a row with name, an `<audio controls>` preview, an inline rename (edit name → `PATCH`), and a delete button (`DELETE`).
  - Empty state when no tracks.

## 8. Public renderer

`server/utils/invitation.ts` (`loadInvitationBySlug`): resolve `inv.musicTrackId → musicTracks.url` (instead of `musicMediaId → media`). The rest of the music playback path (cover → `MusicPlayer`) is unchanged.

## 9. Testing

- **Pure:** `rowBelongsToOwner` true/false/null.
- **Endpoints:** owner-guard 404 on `PATCH`/`DELETE /api/admin/music/:id` for another user's track (via `rowBelongsToOwner`); `GET /api/admin/music` 401 without session; `PATCH …/invitations/:id/music` rejects a track owned by another user (400). (Predicate/guard level, matching the thin-shell convention.)
- **Component:** the Musik page lists tracks and the delete/rename actions call the right endpoints (mock `$fetch`); `InvitationSettings` renders the track dropdown from a provided list and calls `onSetMusic` with the chosen id / null.
- Full suite stays green; typecheck clean.

## 10. Out of Scope

- Global/curated shared music library; track categories/tags; audio trimming/normalization.
- The gallery/video rework (separate spec, Subsystem B).
- Storage quota limits per user.
- Removing the now-unused `mediaBelongsToInvitation` helper (left in place; harmless).

## 11. Success Criteria

1. The customer uploads a track once on the Musik page; it appears in the list and can be renamed and deleted.
2. In any invitation's editor, a dropdown lists the user's tracks; selecting one persists `musicTrackId` and the track plays on the cover (preview + published).
3. A track owned by another user (or invalid id) is rejected; deleting a track nulls it on the owner's invitations that used it and removes the R2 object.
4. One uploaded track is reusable across multiple invitations (no re-upload).

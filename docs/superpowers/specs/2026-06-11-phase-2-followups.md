# Phase 2 Follow-ups (deferred from Phase 0+1)

Tracked items surfaced during Phase 0+1 implementation and final review. None block Phase 0+1; each is intentionally deferred because it depends on Phase 2 work (the editor / upload pipeline) or is a non-blocking enhancement.

---

## Phase 2a follow-ups (deferred to Phase 2b)

Surfaced in the Phase 2a (editor) final review. Two Important fixes (publish/autosave race, pre-buffer upload size cap) and the cover-in-preview criterion were fixed in Phase 2a; these two remain:

### A. Wire uploaded audio to `invitation.musicMediaId`
The media endpoint and `MediaUploader` already support `kind: 'audio'` (upload → R2 → `media` row), but no editor control sets `invitation.musicMediaId`, so an uploaded track is never used as the invitation's music. Spec §10 criterion #3 ("audio … usable in the editor") is therefore only partially met. **Fix (2b):** add a music control in the editor (upload audio → `PATCH /api/admin/invitations/:id/music` setting `musicMediaId`), and resolve `musicMediaId → url` in the editor GET so the preview's `MusicPlayer` can play it (this also lets the cover-in-preview play music, currently cover-only).

### B. Edge/CDN cache purge on publish
Publish versions the public response `ETag` by `published_at`, which makes browsers revalidate — but the public route also sends `s-maxage=300, stale-while-revalidate=600`. A shared CDN (e.g. Vercel Edge) keyed only on the URL can still serve a stale entry for up to ~5–15 min after a publish, so "immediately reflects" (criterion #6) holds for browser conditional-GET but not necessarily for a cold edge cache. **Fix (2b), deployment-dependent:** use the platform's cache-tag/`purge` API on publish, or lower `s-maxage`, or drop edge caching and rely on the fast SSR loader. Decide alongside the Vercel deployment config.

## Blocking for real (non-demo) invitations — do early in Phase 2

### 1. Image `mediaId` → URL resolution
**Gap:** `loadInvitationBySlug` resolves the audio `musicMediaId` to a URL, but image references are left as raw `media` UUIDs:
- `gallery` section `content.items[].mediaId` (for `type: 'image'`)
- `couple` section `people[].photoMediaId`

`GallerySection` currently renders `<NuxtImg :src="mediaId">` and `CoupleSection` ignores `photoMediaId`. With no `@nuxt/image` provider configured and unresolved UUIDs, any real invitation with images would render broken `<img>` tags. Masked in Phase 1 because the seed ships an empty gallery and no couple photos.

**Why deferred:** Real images only exist once the Phase 2 editor + R2 upload pipeline can create `media` rows. Resolution strategy is coupled to that work.

**Fix (Phase 2):**
- In the loader, bulk-fetch `media` rows for every image `mediaId` referenced across section content, build an `id → url` map, and rewrite content so components receive URLs (or store the URL directly in content at write time).
- Render `CoupleSection` photos.
- Decide on `@nuxt/image`: configure an R2 custom provider for `srcset`/optimization, or use plain `<img>` with pre-sized R2 variants.
- Once content carries URLs, remove the `data as any` cast in `app/pages/u/[slug].vue`.

## Non-blocking enhancements

### 2. Cache invalidation on save
Published invitations are served with `s-maxage=300, stale-while-revalidate=600`. When the Phase 2 editor saves changes, it must invalidate the relevant cache key (or bump a version) so edits appear promptly.

### 3. `updatedAt` auto-update
`invitations.updatedAt` is set at insert (`defaultNow()`) but not refreshed on update. Add Drizzle `.$onUpdateFn(() => new Date())` (or set it explicitly in the editor save path) so it tracks real modification time — useful for cache busting.

### 4. Admin role model
`app/middleware/admin.ts` gates `/admin` on `loggedIn` only. The current product model treats every account as an owner of its own invitations (no admin-vs-customer roles), so this is correct today. If Phase 2 introduces privileged/staff roles, add an explicit role check.

### 5. RSVP submit + live guestbook (already Phase 3 in the spec)
`RsvpSection` form is a disabled placeholder and `GuestbookSection` shows an empty list. Wiring the `POST /api/rsvp` write path and live guestbook data is Phase 3 per the design spec.

### 6. Seed richness
The demo seed populates real content only for `hero`, `countdown`, and `quote`; the other sections seed empty defaults, so the demo renders several blank sections. Enriching the seed (couple people, events, love-gift banks, info, opening/closing copy) would make the demo representative and would have surfaced item #1 earlier.

### 7. Minor
- `nuxt.config.ts` declares `runtimeConfig.databaseUrl`, but `server/db/index.ts` reads `process.env.DATABASE_URL` directly — the runtime-config key is unused; wire it or drop it.
- Music media fetch in the loader is sequential after the slug lookup; it could join the `Promise.all` once `musicMediaId` is known.

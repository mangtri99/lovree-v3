# Lovree v3 — Design Spec: Phase 2c (Kelola Tamu / Guest Management)

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** Phase 1 (public renderer + `?guest=` resolution), Phase 2a–2b. Same branch `feat/phase-2b-media`.
- **Scope:** Admin-side guest management for an invitation: add guests (single + bulk paste), list, delete, with an auto-generated per-guest code, a copyable personal invite link, and a WhatsApp share. No RSVP status (Phase 3), no guest editing, no CSV file import.

## 1. Background & Goal

The `guests` table and the public `?guest=<code>` → name resolution already exist (Phase 1): `server/api/invitations/[slug].get.ts` looks up `(invitationId, code)` and the cover greets the guest by name; an unknown code falls back to using the raw query value as the name. What's missing is any way to **create and manage** guests. This phase adds the admin surface so a customer can build their guest list and share a personalized link per guest.

**Goal:** From an invitation's guest page, an owner adds guests (one at a time or by pasting many names), sees each guest's unique code, copies that guest's personal invite URL, shares it via WhatsApp with a prefilled message, and deletes guests.

## 2. Decisions carried in from brainstorming

- **Capabilities (all in scope):** add single, bulk add (paste names), list, delete, copy per-guest link, WhatsApp share.
- **Code format:** human-readable `slugify(name) + '-' + <short random>` (e.g. `budi-x7k2`), reusing the existing `slugify`. Uniqueness per invitation is enforced by the existing `unique(invitationId, code)` constraint; a collision triggers a regenerate-and-retry.
- **Link building:** client-side from `window.location.origin` + the invitation `slug` + the guest `code` (no server origin config needed).
- **WhatsApp:** `https://wa.me/?text=<encoded>` (no stored phone; opens the share/contact picker with a prefilled Indonesian message).
- **Navigation:** a "Tamu" link on each row of the invitations list and in the editor navbar.

## 3. Data model

No migration. The existing `guests` table is used as-is:
```
guests: id (uuid pk), invitationId (uuid fk→invitations), name (text), code (text),
        groupLabel (text nullable), createdAt; UNIQUE(invitationId, code)
```

## 4. Pure utilities (testable, no I/O)

`server/utils/guest-code.ts`:
```ts
import { slugify } from './slug'
// Deterministic given `rand`; caller supplies the random suffix (nanoid) so the
// function is testable and the endpoint controls retry-on-collision.
export function generateGuestCode(name: string, rand: string): string {
  return slugify(name, rand) // slugify already lowercases/hyphenates and falls back to 'undangan'
}
// One name per line, trimmed, blanks dropped. Order preserved. No de-duplication
// (two guests may legitimately share a name; they get distinct codes).
export function parseBulkNames(text: string): string[] {
  return (text ?? '').split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
}
```

`app/utils/guest-link.ts` (client-side link/share builders; pure):
```ts
export function buildGuestLink(origin: string, slug: string, code: string): string {
  return `${origin}/u/${slug}?guest=${encodeURIComponent(code)}`
}
export function buildWhatsappShare(origin: string, slug: string, code: string, name: string): string {
  const link = buildGuestLink(origin, slug, code)
  const msg = `Kepada Yth. ${name},\n\nTanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara kami. Detail & konfirmasi kehadiran:\n${link}\n\nMerupakan suatu kehormatan apabila Bapak/Ibu/Saudara/i berkenan hadir. Terima kasih.`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}
```

## 5. Endpoints

All under `server/api/admin/invitations/[id]/guests`. Every handler loads the invitation, runs `assertOwnerOr404(inv, session.user?.id)` (404 on non-owner — no existence leak; ownerId from session, never body).

- **`GET …/guests`** → `{ guests: Array<{ id, name, code, groupLabel }> }`, ordered by `createdAt`.
- **`POST …/guests`** → body validated with Zod: `{ names: string[] (min 1, each non-empty after trim), groupLabel?: string }`. For each name: generate `code = generateGuestCode(name, nanoid(5))`, insert; on the rare unique-constraint violation, regenerate the code and retry (cap a few attempts). Returns `{ guests: [...created] }`. (Single-add is just a 1-element `names` array; the page sends `parseBulkNames` output for bulk.)
- **`DELETE …/guests/:guestId`** → verify the guest row exists AND `guest.invitationId === :id` (else 404), then delete. Returns `{ ok: true }`.

Insert/delete operate only within the owned invitation; a guestId from another invitation is rejected by the `invitationId` check.

## 6. Page UI

`app/pages/admin/invitations/[id]/guests.vue` (admin layout, `middleware: 'admin'`, `UDashboardPanel`):

- Loads the invitation (`GET /api/admin/invitations/:id`, for `slug`) and the guest list (`GET …/guests`).
- **Add single:** name input + optional group input + "Tambah" → `POST { names: [name], groupLabel }`, prepend/refresh list.
- **Bulk add:** textarea (placeholder "Satu nama per baris") + optional group input + "Tambah Semua" → `POST { names: parseBulkNames(textarea), groupLabel }`. Disabled when the parsed list is empty.
- **Guest table:** columns Nama, Grup, Kode, and actions: **Copy link** (writes `buildGuestLink(origin, slug, code)` to clipboard, shows a brief "Tersalin"), **WA** (anchor/`window.open` to `buildWhatsappShare(...)`, `target=_blank`), **Hapus** (`DELETE`, removes the row). `origin` from `window.location.origin` (guard for SSR: compute on click / `import.meta.client`).
- Empty state: a hint when there are no guests yet.

## 7. Navigation

- `app/pages/admin/invitations/index.vue`: add a "Tamu" `UButton` (`variant="link"`, `:to="/admin/invitations/${inv.id}/guests"`) next to the existing "Edit" link in each row.
- Editor navbar (`[id]/edit.vue`): add a "Tamu" link/button to the guest page so the owner can switch from editing to guest management.

## 8. Testing

- **Pure:** `generateGuestCode('Budi Santoso', 'x7k2')` → `'budi-santoso-x7k2'`; empty name → `'undangan-x7k2'`. `parseBulkNames("Budi\n  \nSiti \n")` → `['Budi','Siti']`. `buildGuestLink('https://x.com','elrumi','budi-x7k2')` → exact URL. `buildWhatsappShare` → `https://wa.me/?text=` containing the encoded name + link.
- **Endpoints (pure-core + thin shell):** owner-guard returns 404 for a non-owner (via `assertOwnerOr404`, already tested) — covered by the belongs check; `DELETE` rejects a guest from another invitation (a small pure predicate `guestBelongsToInvitation(guest, invitationId)` mirrored on `mediaBelongsToInvitation`, unit-tested). POST validation rejects an empty `names` array (Zod).
- **Component:** the bulk textarea + "Tambah Semua" calls POST with the parsed names; the guest row renders Copy/WA/Hapus and the copy action writes the expected link (clipboard mocked).

## 9. Out of Scope

- RSVP status / attendance column — Phase 3.
- Editing a guest's name/group (delete + re-add instead).
- CSV/Excel file import; WhatsApp blast/automation (the share opens the app with prefilled text, user sends manually).
- Per-guest phone storage.
- Pagination (guest lists are expected in the hundreds at most; a simple list is fine — revisit in Phase 4 if needed).

## 10. Success Criteria

1. An owner adds guests one at a time and in bulk (paste names); each appears in the table with a unique `code`.
2. "Copy link" copies `/u/:slug?guest=:code`; opening that link greets the guest by name on the cover.
3. "WA" opens WhatsApp with a prefilled message containing the guest's name and personal link.
4. "Hapus" deletes the guest; a non-owner, or a guestId belonging to another invitation, is rejected with 404.
5. The guest page is reachable from the invitations list and the editor.

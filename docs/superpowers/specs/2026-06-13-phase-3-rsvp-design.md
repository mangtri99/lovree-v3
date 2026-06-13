# Lovree v3 — Design Spec: Phase 3 (RSVP + Guestbook)

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** Phases 0–2c. Same branch `feat/phase-2b-media`.
- **Scope:** Wire the public RSVP form to a submit endpoint, render the guestbook from submitted messages (instant, no moderation), and give the owner an RSVP recap (counts + list + delete). No migration (the `rsvps` table exists). Anti-spam is deferred.

## 1. Background & Goal

`RsvpSection` and `GuestbookSection` are placeholders: the form's submit button is disabled and the guestbook list is hardcoded empty. The `rsvps` table already exists (`id, invitationId, guestId?, name, attendance, message, createdAt`) and `?guest=<code>` resolution is in place. This phase makes RSVP functional end-to-end.

**Goal:** A visitor submits the RSVP form (name, attendance, message); it persists (linked to the guest when `?guest=` matches); their message appears in the guestbook immediately and on reload; the owner sees a recap (attendance counts + all responses) and can delete entries.

## 2. Decisions carried in from brainstorming

- **In scope:** public submit, live guestbook, admin recap. **Deferred:** anti-spam (honeypot/rate-limit), moderation.
- **Guestbook content:** every RSVP with a non-empty `message`, all attendance values, newest first, shown instantly (no approval). The owner removes unwanted entries via the recap's delete.
- **Attendance values:** `'yes' | 'no' | 'maybe'` (labels Hadir / Tidak Hadir / Mungkin).
- **"Live":** the guestbook shows persisted entries on load and the visitor's own submission appears immediately (optimistic prepend). Cross-visitor realtime (polling/websocket) is out of scope.
- **RSVP accepted only for published invitations.**

## 3. Pure utilities (`server/utils/rsvp.ts`)

```ts
export interface RsvpRow { name: string; attendance: string | null; message: string | null; createdAt?: any }

export function summarizeRsvps(rsvps: RsvpRow[]): { yes: number; no: number; maybe: number; total: number } {
  const s = { yes: 0, no: 0, maybe: 0, total: rsvps.length }
  for (const r of rsvps) {
    if (r.attendance === 'yes') s.yes++
    else if (r.attendance === 'no') s.no++
    else if (r.attendance === 'maybe') s.maybe++
  }
  return s
}

// Public guestbook entries: only non-empty messages, mapped to the public shape.
export function toGuestbookEntries(rsvps: RsvpRow[]): Array<{ name: string; message: string; attendance: string | null }> {
  return rsvps
    .filter((r) => (r.message ?? '').trim().length > 0)
    .map((r) => ({ name: r.name, message: (r.message ?? '').trim(), attendance: r.attendance ?? null }))
}
```
`rowBelongsToInvitation` (existing) is reused for the delete guard.

## 4. Public submit endpoint

`POST /api/invitations/[slug]/rsvp`:
- Zod body: `{ name: string (min 1, max 100, trimmed), attendance: z.enum(['yes','no','maybe']), message: z.string().max(1000).optional(), guest: z.string().optional() }`.
- Load invitation by slug; if missing or `status !== 'published'` → 404.
- If `guest` is a non-empty code, look up `(invitationId, code)` → set `guestId` (else null).
- Insert into `rsvps` `{ invitationId, guestId, name, attendance, message: message ?? '' }`.
- Return `{ ok: true, entry: { name, message, attendance } }` (the client prepends it to the guestbook when message is non-empty).

## 5. Public route — return guestbook

`server/api/invitations/[slug].get.ts`: after assembling the invitation, load recent guestbook entries and add them to the response:
- Query `rsvps` for the invitation where `message` is non-empty, newest first, limit 50; map via `toGuestbookEntries`.
- Add `guestbook` to the returned object. (Done once per request; the `?guest`-keyed cache still applies — a fresh submission appears for everyone within the ≤60s edge window, and immediately for the submitter via optimistic prepend.)

## 6. InvitationRoot — provide guestbook + guestName

`app/components/invitation/InvitationRoot.vue`:
- Extend `data` prop type with `guestbook: Array<{ name: string; message: string; attendance: string | null }>`.
- Hold `const guestbook = ref(props.data.guestbook ?? [])`.
- `provide('guestbook', guestbook)` and `provide('guestName', props.guestName)` so the RSVP and guestbook sections (descendants via `SectionRenderer`) can read/update them. (`SectionRenderer` only passes `content`; per-request data flows through provide/inject.)

## 7. RsvpSection — functional form

`app/components/invitation/sections/RsvpSection.vue`:
- `inject('guestbook')` (ref, default `ref([])`) and `inject('guestName', '')`.
- Use `useRoute()` for `slug` (param) and `guest` (query).
- Local refs: `name` (prefilled with the injected guestName), `attendance` (default `'yes'`), `message`, `submitting`, `done`.
- On submit: `POST /api/invitations/:slug/rsvp { name, attendance, message, guest }`. On success: if the returned entry has a non-empty message, `guestbook.value.unshift(entry)` (live); set `done = true` and show a thank-you; disable resubmission. On error: show an inline error message.
- Keep the existing fields/markup; remove the `disabled` and `@submit.prevent` placeholder, wire real handlers, bind `v-model`s.

## 8. GuestbookSection — render injected entries

`app/components/invitation/sections/GuestbookSection.vue`:
- Replace the hardcoded empty `entries` with `inject('guestbook', ref([]))`.
- Render each entry: name, message, and a small attendance label (Hadir/Tidak Hadir/Mungkin). Keep the empty-state ("Belum ada ucapan.").

## 9. Admin recap

- **Endpoint `GET /api/admin/invitations/:id/rsvps`** (owner-guard 404): returns `{ rsvps: [{ id, name, attendance, message, guestId, createdAt }] (newest first), summary: summarizeRsvps(...) }`.
- **Endpoint `DELETE /api/admin/invitations/:id/rsvps/:rsvpId`** (owner-guard + `rowBelongsToInvitation` → 404): delete the row.
- **Page `app/pages/admin/invitations/[id]/rsvp.vue`** (admin layout): summary cards (Hadir / Tidak Hadir / Mungkin / Total) + a table (Nama, Kehadiran, Ucapan, Hapus). Empty state when none.
- **Navigation:** an "RSVP" link on each invitations-list row and in the editor navbar (beside "Tamu").

## 10. Testing

- **Pure:** `summarizeRsvps` counts each bucket + total (incl. null/unknown attendance ignored). `toGuestbookEntries` keeps only non-empty messages, trims, maps shape, preserves order.
- **Endpoints:** owner-guard 404 on recap/delete (via `assertOwnerOr404`); delete rejects a foreign rsvpId (`rowBelongsToInvitation`); POST validates the attendance enum (invalid → 400) and rejects a non-published slug (404). (Predicate/validation-level, matching the thin-shell pattern.)
- **Component:** `GuestbookSection` renders injected entries and the empty state; `RsvpSection` submit posts and prepends a messaged entry to the injected guestbook (mock `$fetch`).

## 11. Out of Scope

- Moderation / approval workflow; anti-spam (honeypot, rate-limit, captcha) — later.
- Editing an RSVP; per-guest "one response only" enforcement (a guest may submit more than once).
- Cross-visitor realtime updates (polling/websocket).
- CSV export of responses (Phase 4 candidate).

## 12. Success Criteria

1. A visitor on a published invitation submits the RSVP form; the row persists, with `guestId` set when `?guest=<code>` matches.
2. RSVP messages render in the guestbook on load (newest first) and the visitor's own message appears immediately after submitting.
3. The owner's RSVP page shows attendance counts and every response, and can delete an entry.
4. A non-owner cannot read or delete the recap (404); a foreign `rsvpId` delete is rejected (404).
5. An invalid attendance value or a non-published slug is rejected (400 / 404).

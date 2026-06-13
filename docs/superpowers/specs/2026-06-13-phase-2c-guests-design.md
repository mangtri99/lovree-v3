# Lovree v3 — Design Spec: Phase 2c (Kelola Tamu & Sesi / Guest + Session Management)

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** Phase 1 (public renderer + `?guest=` resolution), Phase 2a–2b. Same branch `feat/phase-2b-media`.
- **Scope:** Admin-side guest management (add single + bulk, list, delete, per-guest code, copyable personal link, WhatsApp share) **and** time-session management (CRUD sessions; assign an optional session to a guest; a guest's session overrides the start/end time of one targeted event on that guest's personalized invitation). No RSVP status (Phase 3), no guest editing, no CSV file import.

## 1. Background & Goal

The `guests` table and the public `?guest=<code>` → name resolution already exist (Phase 1): `server/api/invitations/[slug].get.ts` looks up `(invitationId, code)` and the cover greets the guest by name; an unknown code falls back to the raw query value. What's missing is any way to **create and manage** guests, and a way to give different guests different reception time-slots ("sesi").

**Goal:** From an invitation's guest page an owner builds the guest list (single or bulk), defines time sessions, optionally assigns a session to each guest, and shares a personalized link. When a guest with a session opens their link, the targeted event's start/end time on their invitation shows the session's time; guests without a session see the event's default time.

## 2. Decisions carried in from brainstorming

- **Guest capabilities (all in scope):** add single, bulk add (paste names), list, delete, copy per-guest link, WhatsApp share.
- **Guest code format:** `slugify(name) + '-' + <short random>` (e.g. `budi-x7k2`), reusing `slugify`. Uniqueness per invitation enforced by the existing `unique(invitationId, code)` constraint; collision → regenerate-and-retry.
- **Sessions:** a session has `targetEvent` (the name of the event it overrides), `timeStart`, `timeEnd` (free text; e.g. `"09:00"` / `"18:00"` / `"Selesai"`). CRUD on the guest page.
- **Session ↔ event binding:** by **event name** — at render, an event whose `name` equals the session's `targetEvent` has its `timeStart`/`timeEnd` replaced. Robust to event reordering; **breaks if the targeted event is renamed** (documented caveat — falls back to the event's own time, never errors).
- **Guest ↔ session:** `guests.sessionId` nullable. Assigned (optionally) when adding a guest.
- **No extra query param:** the URL stays `?guest=<code>`. The session is derived server-side from the guest row — single source of truth, not URL-overridable.
- **Link building:** client-side from `window.location.origin` + `slug` + `code`.
- **WhatsApp:** `https://wa.me/?text=<encoded>` with a prefilled Indonesian message.
- **Navigation:** a "Tamu" link on each invitations-list row and in the editor navbar.

## 3. Data model (migration 0003)

Add a `sessions` table and a `sessionId` column on `guests` (Drizzle schema → `drizzle-kit generate` produces migration `0003`).

```ts
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  targetEvent: text('target_event').notNull(), // event name this session overrides
  timeStart: text('time_start').notNull().default(''),
  timeEnd: text('time_end').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```
Add to `guests`: `sessionId: uuid('session_id').references(() => sessions.id)` (nullable). Existing `guests` columns unchanged (`unique(invitationId, code)` kept).

(Define `sessions` before `guests` in the schema file, or use the lazy `() => sessions.id` reference, so the FK resolves.)

## 4. Pure utilities (testable, no I/O)

`server/utils/guest-code.ts`:
```ts
import { slugify } from './slug'
export function generateGuestCode(name: string, rand: string): string {
  return slugify(name, rand) // lowercases/hyphenates; empty name → 'undangan-<rand>'
}
export function parseBulkNames(text: string): string[] {
  return (text ?? '').split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
}
```

`server/utils/session-apply.ts`:
```ts
export interface GuestSession { targetEvent: string; timeStart: string; timeEnd: string }
// Returns a new sections array. For each `event` section, any event item whose
// `name` matches the session's targetEvent has its timeStart/timeEnd replaced.
// A null session (guest without one) returns the sections unchanged (identity).
export function applyGuestSession(sections: any[], session: GuestSession | null): any[] {
  if (!session) return sections
  return sections.map((s) => {
    if (s.type !== 'event') return s
    const events = (s.content?.events ?? []).map((e: any) =>
      e.name === session.targetEvent ? { ...e, timeStart: session.timeStart, timeEnd: session.timeEnd } : e)
    return { ...s, content: { ...s.content, events } }
  })
}
```

`server/utils/belongs.ts` (or extend the existing media-belongs pattern) — a small predicate reused for guest+session ownership:
```ts
export function rowBelongsToInvitation(row: { invitationId: string } | null, invitationId: string): boolean {
  return !!row && row.invitationId === invitationId
}
```
(Used to reject a `guestId`/`sessionId` from another invitation. Mirrors `mediaBelongsToInvitation`.)

`app/utils/guest-link.ts` (client-side, pure):
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

All under `server/api/admin/invitations/[id]/…`. Every handler loads the invitation and runs `assertOwnerOr404(inv, session.user?.id)` (404 on non-owner; ownerId from session, never body).

**Sessions:**
- `GET …/sessions` → `{ sessions: Array<{ id, targetEvent, timeStart, timeEnd }> }` ordered by `createdAt`.
- `POST …/sessions` → Zod body `{ targetEvent: string (min 1), timeStart?: string, timeEnd?: string }`. Insert. Returns the created row. (No check that `targetEvent` matches an existing event name — the form populates it from the document, and a non-matching name simply yields no override; this keeps the endpoint decoupled from document contents.)
- `DELETE …/sessions/:sessionId` → verify `rowBelongsToInvitation(sessionRow, :id)` else 404, delete. (Guests referencing it: set their `sessionId` to null in the same transaction so no dangling FK / orphan reference.)

**Guests:**
- `GET …/guests` → `{ guests: Array<{ id, name, code, groupLabel, sessionId }> }` ordered by `createdAt`.
- `POST …/guests` → Zod body `{ names: string[] (min 1, each non-empty after trim), groupLabel?: string, sessionId?: string | null }`. If `sessionId` is provided, verify it belongs to this invitation (`rowBelongsToInvitation`) else 400. For each name: `code = generateGuestCode(name, nanoid(5))`, insert with `sessionId`; on unique-constraint violation regenerate the code and retry (cap attempts). Returns `{ guests: [...created] }`.
- `DELETE …/guests/:guestId` → verify `rowBelongsToInvitation(guestRow, :id)` else 404, delete. Returns `{ ok: true }`.

## 6. Public route — personalized session times

`server/api/invitations/[slug].get.ts` already resolves `?guest=<code>` to a name via `resolveGuestName`. Extend it: when the guest query matches a real guest row with a non-null `sessionId`, load that session and apply `applyGuestSession(sections, session)` to the assembled sections before returning. Concretely:
- After `loadInvitationBySlug`, when resolving the guest, also fetch the guest row (by `invitationId` + `code`) to get `sessionId` (the existing `resolveGuestName` lookup can be widened to return the row, or a second small query runs).
- If a session is found, replace `inv.sections` with `applyGuestSession(inv.sections, session)`.
- A free-text `?guest=Eko` (no matching code) → no row → no session → default times. Unchanged behavior otherwise.

The override is request-scoped; the stored published document is never mutated.

## 7. Page UI

`app/pages/admin/invitations/[id]/guests.vue` (admin layout, `middleware: 'admin'`, `UDashboardPanel`):
- Loads the invitation (`GET /api/admin/invitations/:id` — for `slug` and the event names from `draftDocument`), the session list (`GET …/sessions`), and the guest list (`GET …/guests`).
- **Sessions block:** list existing sessions (`targetEvent timeStart–timeEnd`, delete button). Add form: a **target-event select** (options = event names extracted from the invitation's event section(s); disabled with a hint "Tambah acara dulu di editor" when none) + `timeStart` + `timeEnd` inputs + "Tambah Sesi".
- **Add single guest:** name input + optional group input + **session select** (optional; options = sessions, shown as `targetEvent timeStart–timeEnd`, plus a "— tanpa sesi —" default) + "Tambah".
- **Bulk add:** textarea ("Satu nama per baris") + optional group + optional session select (applied to the whole batch) + "Tambah Semua" → `POST { names: parseBulkNames(text), groupLabel, sessionId }`. Disabled when the parsed list is empty.
- **Guest table:** columns Nama, Grup, Sesi (the assigned session's label or "—"), Kode, actions: **Copy link** (`buildGuestLink` → clipboard, brief "Tersalin"), **WA** (`window.open(buildWhatsappShare(...), '_blank')`), **Hapus** (`DELETE`). `origin` from `window.location.origin` (computed on click / `import.meta.client`).
- Empty-state hints for no sessions / no guests.

## 8. Navigation

- `app/pages/admin/invitations/index.vue`: add a "Tamu" `UButton` (`variant="link"`, `:to="/admin/invitations/${inv.id}/guests"`) beside "Edit".
- Editor (`[id]/edit.vue`) navbar: add a "Tamu" link/button to the guest page.

## 9. Testing

- **Pure:** `generateGuestCode('Budi Santoso','x7k2')` → `'budi-santoso-x7k2'`; empty name → `'undangan-x7k2'`. `parseBulkNames("Budi\n  \nSiti \n")` → `['Budi','Siti']`. `buildGuestLink` exact URL; `buildWhatsappShare` → `wa.me/?text=` containing the encoded name + link. `applyGuestSession`: overrides the matching event's times, leaves non-matching events and non-event sections untouched, and is identity for a null session; original sections not mutated. `rowBelongsToInvitation` true/false/null.
- **Endpoints:** owner-guard 404 (via `assertOwnerOr404`); `DELETE guests/sessions` rejects a row from another invitation (predicate); `POST guests` with a foreign `sessionId` → 400; `POST guests` empty `names` → 400 (Zod); deleting a session nulls referencing guests' `sessionId`.
- **Component:** bulk textarea + "Tambah Semua" posts the parsed names + selected `sessionId`; the guest row renders Copy/WA/Hapus and Copy writes the expected link (clipboard mocked); the session add form's target-event select is disabled when there are no events.

## 10. Out of Scope

- RSVP status / attendance column — Phase 3.
- Editing a guest or session in place (delete + re-add instead).
- CSV/Excel file import; WhatsApp blast/automation.
- Per-guest phone storage; binding a session to multiple events or to a fixed event id (name-binding only).
- Pagination.

## 11. Success Criteria

1. An owner adds guests single + bulk; each appears with a unique `code`.
2. "Copy link" copies `/u/:slug?guest=:code`; opening it greets the guest by name.
3. "WA" opens WhatsApp with a prefilled message containing the guest's name + link.
4. "Hapus" deletes the guest; a non-owner or a foreign `guestId`/`sessionId` is rejected (404 / 400).
5. The guest page is reachable from the invitations list and the editor.
6. An owner creates a session (target event + start/end), assigns it to a guest; that guest's link shows the session's time on the targeted event, while a guest without a session (or one targeting a renamed/absent event) sees the default event time.
7. Deleting a session removes it and clears it from any guest that referenced it; no error on those guests' links.

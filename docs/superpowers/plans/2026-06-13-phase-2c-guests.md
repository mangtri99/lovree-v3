# Phase 2c (Kelola Tamu & Sesi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin guest management (add single + bulk, list, delete, per-guest code + copyable link + WhatsApp share) plus time-session CRUD where a guest's assigned session overrides the start/end time of one named event on that guest's personalized invitation.

**Architecture:** Pure utilities (code/link/session logic) tested in isolation; thin owner-guarded Nitro endpoints around them and Drizzle; a new admin page; and a request-scoped override applied in the public route (the stored document is never mutated). New `sessions` table + `guests.sessionId` (migration 0003). Session→event binding is by event name.

**Tech Stack:** Nuxt 4 (Nitro), Drizzle ORM + Neon Postgres, Zod, nanoid, Vitest + @vue/test-utils, Nuxt UI v4.

**Branch:** `feat/phase-2b-media` (continuation).

**Grounding facts:**
- `guests` table: `id, invitationId, name, code, groupLabel, createdAt`, `unique(invitationId, code)`.
- `assertOwnerOr404(inv|null, viewerId|null)` (server/utils/ownership.ts) throws 404 if not owner; pattern used by every admin mutation; ownerId always from `session.user?.id`.
- `slugify(input, suffix?)` (server/utils/slug.ts): lowercases/hyphenates, `||'undangan'` fallback, appends `-suffix`.
- Public route `server/api/invitations/[slug].get.ts` resolves `?guest=` to a name; query string is part of the edge cache key, so per-guest personalization is cache-safe (existing behavior).
- EventSection content shape: `{ events: Array<{ name, date, timeStart, timeEnd, venue, mapsUrl }> }`. It renders `{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span>`.
- Admin invitation GET returns `draftDocument` (has `.sections`) and `slug`.
- `mediaBelongsToInvitation` (server/utils/media-belongs.ts) is the predicate pattern to mirror.
- Migrations live in `server/db/migrations`; latest is `0002`. `npm run db:generate` (drizzle-kit) produces the next from the schema; `npm run db:migrate` applies it. **Do NOT run `db:migrate` from a subagent** (it hits the live Neon DB) — generating the SQL is enough for the code; the user applies it.

---

## File Structure

**Pure utils (server):**
- Create `server/utils/guest-code.ts` — `generateGuestCode`, `parseBulkNames`.
- Create `server/utils/belongs.ts` — `rowBelongsToInvitation`.
- Create `server/utils/session-apply.ts` — `GuestSession`, `applyGuestSession`.

**Pure utils (app):**
- Create `app/utils/guest-link.ts` — `buildGuestLink`, `buildWhatsappShare`.

**Schema / migration:**
- Modify `server/db/schema.ts` — add `sessions` table + `guests.sessionId`; generate migration `0003`.

**Endpoints (server):**
- Create `server/api/admin/invitations/[id]/sessions/index.get.ts`, `index.post.ts`, `[sessionId].delete.ts`.
- Create `server/api/admin/invitations/[id]/guests/index.get.ts`, `index.post.ts`, `[guestId].delete.ts`.
- Modify `server/api/invitations/[slug].get.ts` — apply the guest's session override.

**UI (app):**
- Create `app/pages/admin/invitations/[id]/guests.vue`.
- Modify `app/pages/admin/invitations/index.vue` + `app/pages/admin/invitations/[id]/edit.vue` — "Tamu" nav links.

**Tests:** `tests/utils/`, `tests/components/`.

---

## Task 1: Guest code + bulk-name pure utils

**Files:**
- Create: `server/utils/guest-code.ts`
- Test: `tests/utils/guest-code.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/guest-code.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateGuestCode, parseBulkNames } from '../../server/utils/guest-code'

describe('generateGuestCode', () => {
  it('slugifies the name and appends the random suffix', () => {
    expect(generateGuestCode('Budi Santoso', 'x7k2')).toBe('budi-santoso-x7k2')
  })
  it('falls back to "undangan" for an empty/symbol-only name', () => {
    expect(generateGuestCode('', 'x7k2')).toBe('undangan-x7k2')
    expect(generateGuestCode('!!!', 'x7k2')).toBe('undangan-x7k2')
  })
})

describe('parseBulkNames', () => {
  it('splits lines, trims, and drops blanks; preserves order; no dedupe', () => {
    expect(parseBulkNames('Budi\n  \nSiti \n\nBudi')).toEqual(['Budi', 'Siti', 'Budi'])
  })
  it('returns [] for empty/whitespace input', () => {
    expect(parseBulkNames('')).toEqual([])
    expect(parseBulkNames('   \n  ')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/guest-code.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/utils/guest-code.ts`**

```ts
import { slugify } from './slug'

// Deterministic given `rand`; the endpoint supplies a nanoid and retries on a
// unique-constraint collision.
export function generateGuestCode(name: string, rand: string): string {
  return slugify(name, rand)
}

// One name per line, trimmed, blanks dropped, order preserved, no de-duplication
// (two guests may share a name and still get distinct codes).
export function parseBulkNames(text: string): string[] {
  return (text ?? '').split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/guest-code.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/guest-code.ts tests/utils/guest-code.test.ts
git commit -m "feat: guest code + bulk-name pure utils"
```

---

## Task 2: `rowBelongsToInvitation` predicate

**Files:**
- Create: `server/utils/belongs.ts`
- Test: `tests/utils/belongs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/belongs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rowBelongsToInvitation } from '../../server/utils/belongs'

describe('rowBelongsToInvitation', () => {
  it('true when the row belongs to the invitation', () => {
    expect(rowBelongsToInvitation({ invitationId: 'inv1' }, 'inv1')).toBe(true)
  })
  it('false for another invitation', () => {
    expect(rowBelongsToInvitation({ invitationId: 'other' }, 'inv1')).toBe(false)
  })
  it('false for a missing row', () => {
    expect(rowBelongsToInvitation(null, 'inv1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/belongs.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/utils/belongs.ts`**

```ts
// True iff the row exists and belongs to the given invitation. Used to reject a
// guestId/sessionId from another invitation before mutating. Mirrors
// mediaBelongsToInvitation (which adds a type/kind check media rows need).
export function rowBelongsToInvitation(row: { invitationId: string } | null, invitationId: string): boolean {
  return !!row && row.invitationId === invitationId
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/belongs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/belongs.ts tests/utils/belongs.test.ts
git commit -m "feat: rowBelongsToInvitation predicate for guest/session ownership"
```

---

## Task 3: `applyGuestSession` override

**Files:**
- Create: `server/utils/session-apply.ts`
- Test: `tests/utils/session-apply.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/session-apply.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyGuestSession } from '../../server/utils/session-apply'

const sections = () => [
  { type: 'hero', content: { title: 'X' } },
  { type: 'event', content: { events: [
    { name: 'Akad', timeStart: '08:00', timeEnd: '09:00' },
    { name: 'Resepsi', timeStart: '11:00', timeEnd: '13:00' },
  ] } },
]

describe('applyGuestSession', () => {
  it('overrides only the event whose name matches targetEvent', () => {
    const out = applyGuestSession(sections(), { targetEvent: 'Resepsi', timeStart: '14:00', timeEnd: 'Selesai' })
    const ev = out[1].content.events
    expect(ev[0]).toEqual({ name: 'Akad', timeStart: '08:00', timeEnd: '09:00' })
    expect(ev[1]).toEqual({ name: 'Resepsi', timeStart: '14:00', timeEnd: 'Selesai' })
  })
  it('is identity for a null session', () => {
    const input = sections()
    expect(applyGuestSession(input, null)).toBe(input)
  })
  it('leaves non-event sections and non-matching events untouched, and does not mutate the input', () => {
    const input = sections()
    const out = applyGuestSession(input, { targetEvent: 'Nonexistent', timeStart: '14:00', timeEnd: '' })
    expect(out[0]).toEqual({ type: 'hero', content: { title: 'X' } })
    expect(out[1].content.events[1].timeStart).toBe('11:00')
    expect(input[1].content.events[1].timeStart).toBe('11:00') // original unchanged
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/session-apply.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/utils/session-apply.ts`**

```ts
export interface GuestSession { targetEvent: string; timeStart: string; timeEnd: string }

// Returns a new sections array (input not mutated). For each `event` section, any
// event item whose name equals the session's targetEvent has its timeStart/timeEnd
// replaced with the session's. A null session returns the same array reference.
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/session-apply.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/session-apply.ts tests/utils/session-apply.test.ts
git commit -m "feat: applyGuestSession overrides a named event's time per guest"
```

---

## Task 4: Guest link + WhatsApp share builders

**Files:**
- Create: `app/utils/guest-link.ts`
- Test: `tests/utils/guest-link.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/guest-link.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildGuestLink, buildWhatsappShare } from '../../app/utils/guest-link'

describe('buildGuestLink', () => {
  it('builds the personalized invitation URL', () => {
    expect(buildGuestLink('https://lovree.com', 'elrumi', 'budi-x7k2')).toBe('https://lovree.com/u/elrumi?guest=budi-x7k2')
  })
})

describe('buildWhatsappShare', () => {
  it('returns a wa.me URL containing the encoded name and link', () => {
    const url = buildWhatsappShare('https://lovree.com', 'elrumi', 'budi-x7k2', 'Budi')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    const text = decodeURIComponent(url.replace('https://wa.me/?text=', ''))
    expect(text).toContain('Budi')
    expect(text).toContain('https://lovree.com/u/elrumi?guest=budi-x7k2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/guest-link.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `app/utils/guest-link.ts`**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/guest-link.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/guest-link.ts tests/utils/guest-link.test.ts
git commit -m "feat: guest invite link + WhatsApp share builders"
```

---

## Task 5: Schema — `sessions` table + `guests.sessionId` (migration 0003)

**Files:**
- Modify: `server/db/schema.ts`
- Generated: `server/db/migrations/0003_*.sql`

- [ ] **Step 1: Add the `sessions` table**

In `server/db/schema.ts`, add the `sessions` table. It must be declared **before** `guests` so `guests.sessionId` can reference it (or use a lazy `() => sessions.id` ref — Drizzle supports lazy refs, but ordering is simplest). Place `sessions` immediately above the existing `guests` definition:

```ts
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  targetEvent: text('target_event').notNull(),
  timeStart: text('time_start').notNull().default(''),
  timeEnd: text('time_end').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 2: Add `sessionId` to `guests`**

In the existing `guests` table definition, add the column (keep all existing columns + the `unique(invitationId, code)`):

```ts
  sessionId: uuid('session_id').references(() => sessions.id),
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new file `server/db/migrations/0003_*.sql` is created (CREATE TABLE sessions; ALTER TABLE guests ADD COLUMN session_id …). Confirm it exists:
Run: `ls server/db/migrations/0003_*.sql`

> Do NOT run `npm run db:migrate` here (it applies against the live Neon DB) — that is a manual step the user runs before using the feature.

- [ ] **Step 4: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add server/db/schema.ts server/db/migrations/0003_*.sql
git commit -m "feat: sessions table + guests.sessionId (migration 0003)"
```

---

## Task 6: Sessions endpoints (GET / POST / DELETE)

**Files:**
- Create: `server/api/admin/invitations/[id]/sessions/index.get.ts`
- Create: `server/api/admin/invitations/[id]/sessions/index.post.ts`
- Create: `server/api/admin/invitations/[id]/sessions/[sessionId].delete.ts`
- Test: none new (owner-guard via `assertOwnerOr404`, ownership via `rowBelongsToInvitation` — both already unit-tested; verified by typecheck + Task 11).

- [ ] **Step 1: GET sessions**

Create `server/api/admin/invitations/[id]/sessions/index.get.ts`:

```ts
import { eq, asc } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, sessions } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const rows = await db.select({ id: sessions.id, targetEvent: sessions.targetEvent, timeStart: sessions.timeStart, timeEnd: sessions.timeEnd })
    .from(sessions).where(eq(sessions.invitationId, id)).orderBy(asc(sessions.createdAt))
  return { sessions: rows }
})
```

- [ ] **Step 2: POST session**

Create `server/api/admin/invitations/[id]/sessions/index.post.ts`:

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, sessions } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'

const body = z.object({
  targetEvent: z.string().min(1),
  timeStart: z.string().default(''),
  timeEnd: z.string().default(''),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const [row] = await db.insert(sessions).values({ invitationId: id, ...parsed.data })
    .returning({ id: sessions.id, targetEvent: sessions.targetEvent, timeStart: sessions.timeStart, timeEnd: sessions.timeEnd })
  return row
})
```

- [ ] **Step 3: DELETE session (and null referencing guests)**

Create `server/api/admin/invitations/[id]/sessions/[sessionId].delete.ts`:

```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, sessions, guests } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { rowBelongsToInvitation } from '../../../../../utils/belongs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const sessionId = getRouterParam(event, 'sessionId')!
  const userSession = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, userSession.user?.id ?? null)

  const [row] = await db.select({ invitationId: sessions.invitationId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (!rowBelongsToInvitation(row ?? null, id)) throw createError({ statusCode: 404, message: 'Not found' })

  await db.update(guests).set({ sessionId: null }).where(eq(guests.sessionId, sessionId))
  await db.delete(sessions).where(eq(sessions.id, sessionId))
  return { ok: true }
})
```

- [ ] **Step 4: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "server/api/admin/invitations/[id]/sessions"
git commit -m "feat: sessions CRUD endpoints (owner-guarded; delete nulls referencing guests)"
```

---

## Task 7: Guests endpoints (GET / POST bulk+session / DELETE)

**Files:**
- Create: `server/api/admin/invitations/[id]/guests/index.get.ts`
- Create: `server/api/admin/invitations/[id]/guests/index.post.ts`
- Create: `server/api/admin/invitations/[id]/guests/[guestId].delete.ts`
- Test: none new (pure logic covered by Tasks 1/2; verified by typecheck + Task 11).

- [ ] **Step 1: GET guests**

Create `server/api/admin/invitations/[id]/guests/index.get.ts`:

```ts
import { eq, asc } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, guests } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)
  const rows = await db.select({ id: guests.id, name: guests.name, code: guests.code, groupLabel: guests.groupLabel, sessionId: guests.sessionId })
    .from(guests).where(eq(guests.invitationId, id)).orderBy(asc(guests.createdAt))
  return { guests: rows }
})
```

- [ ] **Step 2: POST guests (single or bulk, optional session)**

Create `server/api/admin/invitations/[id]/guests/index.post.ts`:

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDb } from '../../../../../db'
import { invitations, guests, sessions } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { rowBelongsToInvitation } from '../../../../../utils/belongs'
import { generateGuestCode } from '../../../../../utils/guest-code'

const body = z.object({
  names: z.array(z.string().transform((s) => s.trim()).refine((s) => s.length > 0, 'empty name')).min(1),
  groupLabel: z.string().optional(),
  sessionId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { names, groupLabel, sessionId } = parsed.data

  if (sessionId) {
    const [s] = await db.select({ invitationId: sessions.invitationId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    if (!rowBelongsToInvitation(s ?? null, id)) throw createError({ statusCode: 400, message: 'Invalid session' })
  }

  const created: Array<{ id: string; name: string; code: string }> = []
  for (const name of names) {
    let inserted: { id: string; name: string; code: string } | undefined
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const code = generateGuestCode(name, nanoid(5))
      try {
        const [row] = await db.insert(guests).values({ invitationId: id, name, code, groupLabel: groupLabel || null, sessionId: sessionId ?? null })
          .returning({ id: guests.id, name: guests.name, code: guests.code })
        inserted = row
      } catch (e: any) {
        // unique(invitationId, code) collision → regenerate and retry
        if (attempt === 4) throw createError({ statusCode: 500, message: 'Could not generate a unique code' })
      }
    }
    if (inserted) created.push(inserted)
  }
  return { guests: created }
})
```

- [ ] **Step 3: DELETE guest**

Create `server/api/admin/invitations/[id]/guests/[guestId].delete.ts`:

```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../db'
import { invitations, guests } from '../../../../../db/schema'
import { assertOwnerOr404 } from '../../../../../utils/ownership'
import { rowBelongsToInvitation } from '../../../../../utils/belongs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const guestId = getRouterParam(event, 'guestId')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const [row] = await db.select({ invitationId: guests.invitationId }).from(guests).where(eq(guests.id, guestId)).limit(1)
  if (!rowBelongsToInvitation(row ?? null, id)) throw createError({ statusCode: 404, message: 'Not found' })

  await db.delete(guests).where(eq(guests.id, guestId))
  return { ok: true }
})
```

- [ ] **Step 4: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "server/api/admin/invitations/[id]/guests"
git commit -m "feat: guests CRUD endpoints (single + bulk, optional session, owner-guarded)"
```

---

## Task 8: Public route — apply the guest's session override

**Files:**
- Modify: `server/api/invitations/[slug].get.ts`
- Test: none new (`applyGuestSession` covered in Task 3; route is a thin shell — verified by typecheck + Task 11).

- [ ] **Step 1: Replace the guest-name resolution with row+session resolution**

In `server/api/invitations/[slug].get.ts`, update the imports:

```ts
import { guests, sessions } from '../../db/schema'
import { applyGuestSession } from '../../utils/session-apply'
```
(Remove the `resolveGuestName` import — it is replaced below. Keep `eq, and`, `useDb`, etc.)

Replace the block from `const rawGuest = …` through the final `return` with:

```ts
  const rawGuest = getQuery(event).guest
  const guestParam = Array.isArray(rawGuest) ? rawGuest[0] : (rawGuest as string | undefined)
  const code = (guestParam ?? '').trim()

  let guestRow: { name: string; sessionId: string | null } | null = null
  if (code) {
    const g = await useDb().select({ name: guests.name, sessionId: guests.sessionId })
      .from(guests).where(and(eq(guests.invitationId, inv.id), eq(guests.code, code))).limit(1)
    guestRow = g[0] ?? null
  }
  const guestName = code ? (guestRow?.name ?? code) : 'Tamu Undangan'

  let sections = inv.sections
  if (guestRow?.sessionId) {
    const [s] = await useDb().select({ targetEvent: sessions.targetEvent, timeStart: sessions.timeStart, timeEnd: sessions.timeEnd })
      .from(sessions).where(eq(sessions.id, guestRow.sessionId)).limit(1)
    if (s) sections = applyGuestSession(inv.sections, s)
  }

  const { ownerId, publishedAt, ...publicData } = inv
  return { ...publicData, sections, guestName }
```

This preserves the prior name behavior (empty → `'Tamu Undangan'`, code match → name, no match → raw value as name) and adds the session override. `resolveGuestName` (server/utils/guest.ts) and its test remain untouched (now unused by this route, kept for its unit coverage).

- [ ] **Step 2: Typecheck + run the invitation-route test**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run tests/api/invitation-route.test.ts` (must still pass)

- [ ] **Step 3: Commit**

```bash
git add server/api/invitations/[slug].get.ts
git commit -m "feat: personalize event times by the guest's session on the public route"
```

---

## Task 9: Guest management page

**Files:**
- Create: `app/pages/admin/invitations/[id]/guests.vue`
- Test: `tests/components/guest-link.test.ts` is already covered (Task 4); no page-level unit test (integration page — verified by typecheck + Task 11).

- [ ] **Step 1: Create the page**

Create `app/pages/admin/invitations/[id]/guests.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildGuestLink, buildWhatsappShare } from '~/utils/guest-link'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string

const { data: inv } = await useFetch<any>(`/api/admin/invitations/${id}`)
if (!inv.value) throw createError({ statusCode: 404, statusMessage: 'Tidak ditemukan' })
const slug = computed(() => (inv.value as any)?.slug ?? '')

// Event names from the draft document (sessions target one by name).
const eventNames = computed<string[]>(() => {
  const secs = ((inv.value as any)?.draftDocument?.sections ?? []) as any[]
  const names = secs.filter((s) => s.type === 'event').flatMap((s) => s.content?.events ?? []).map((e: any) => e.name).filter((n: string) => !!n)
  return [...new Set(names)]
})

const { data: sessionsData, refresh: refreshSessions } = await useFetch<any>(`/api/admin/invitations/${id}/sessions`)
const { data: guestsData, refresh: refreshGuests } = await useFetch<any>(`/api/admin/invitations/${id}/guests`)
const sessions = computed<any[]>(() => (sessionsData.value as any)?.sessions ?? [])
const guests = computed<any[]>(() => (guestsData.value as any)?.guests ?? [])
const sessionLabel = (s: any) => `${s.targetEvent} ${s.timeStart}${s.timeEnd ? '–' + s.timeEnd : ''}`
const sessionById = (sid: string | null) => sessions.value.find((s) => s.id === sid)

// Session add form
const sTarget = ref('')
const sStart = ref('')
const sEnd = ref('')
async function addSession() {
  if (!sTarget.value) return
  await $fetch(`/api/admin/invitations/${id}/sessions`, { method: 'POST', body: { targetEvent: sTarget.value, timeStart: sStart.value, timeEnd: sEnd.value } })
  sTarget.value = ''; sStart.value = ''; sEnd.value = ''
  await refreshSessions()
}
async function delSession(sid: string) {
  await $fetch(`/api/admin/invitations/${id}/sessions/${sid}`, { method: 'DELETE' })
  await Promise.all([refreshSessions(), refreshGuests()])
}

// Guest add forms
const gName = ref('')
const gGroup = ref('')
const gSession = ref<string | ''>('')
async function addGuest() {
  if (!gName.value.trim()) return
  await $fetch(`/api/admin/invitations/${id}/guests`, { method: 'POST', body: { names: [gName.value.trim()], groupLabel: gGroup.value || undefined, sessionId: gSession.value || null } })
  gName.value = ''
  await refreshGuests()
}
const bulkText = ref('')
const bulkGroup = ref('')
const bulkSession = ref<string | ''>('')
const bulkNames = computed(() => bulkText.value.split('\n').map((s) => s.trim()).filter(Boolean))
async function addBulk() {
  if (!bulkNames.value.length) return
  await $fetch(`/api/admin/invitations/${id}/guests`, { method: 'POST', body: { names: bulkNames.value, groupLabel: bulkGroup.value || undefined, sessionId: bulkSession.value || null } })
  bulkText.value = ''
  await refreshGuests()
}
async function delGuest(gid: string) {
  await $fetch(`/api/admin/invitations/${id}/guests/${gid}`, { method: 'DELETE' })
  await refreshGuests()
}

// Link / share actions (client-only: window.location.origin)
const copied = ref<string | null>(null)
async function copyLink(code: string) {
  const url = buildGuestLink(window.location.origin, slug.value, code)
  await navigator.clipboard.writeText(url)
  copied.value = code
  setTimeout(() => { if (copied.value === code) copied.value = null }, 1500)
}
function shareWa(code: string, name: string) {
  window.open(buildWhatsappShare(window.location.origin, slug.value, code, name), '_blank')
}
</script>

<template>
  <UDashboardPanel id="guests">
    <template #header>
      <UDashboardNavbar title="Kelola Tamu">
        <template #right>
          <UButton variant="link" :to="`/admin/invitations/${id}/edit`" label="Editor" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-6">
        <!-- Sessions -->
        <UCard>
          <h2 class="mb-3 font-medium">Sesi Waktu</h2>
          <div v-if="!eventNames.length" class="mb-3 rounded border border-dashed p-3 text-sm text-gray-500">
            Belum ada acara. Tambah bagian "Detail Acara" di editor dulu untuk membuat sesi.
          </div>
          <div v-else class="mb-3 flex flex-wrap items-end gap-2">
            <USelect v-model="sTarget" :items="eventNames" placeholder="Acara" />
            <UInput v-model="sStart" placeholder="Mulai (mis. 09:00)" />
            <UInput v-model="sEnd" placeholder="Selesai (mis. 18:00 / Selesai)" />
            <UButton label="Tambah Sesi" @click="addSession" />
          </div>
          <ul class="space-y-1 text-sm">
            <li v-for="s in sessions" :key="s.id" class="flex items-center gap-2">
              <span>{{ sessionLabel(s) }}</span>
              <UButton class="ml-auto" size="xs" color="error" variant="ghost" label="Hapus" @click="delSession(s.id)" />
            </li>
          </ul>
        </UCard>

        <!-- Add guests -->
        <UCard>
          <h2 class="mb-3 font-medium">Tambah Tamu</h2>
          <div class="mb-4 flex flex-wrap items-end gap-2">
            <UInput v-model="gName" placeholder="Nama tamu" />
            <UInput v-model="gGroup" placeholder="Grup (opsional)" />
            <USelect v-model="gSession" :items="[{ label: '— tanpa sesi —', value: '' }, ...sessions.map((s) => ({ label: sessionLabel(s), value: s.id }))]" />
            <UButton label="Tambah" @click="addGuest" />
          </div>
          <div class="flex flex-wrap items-end gap-2">
            <UTextarea v-model="bulkText" :rows="4" placeholder="Tambah banyak: satu nama per baris" class="min-w-64" />
            <UInput v-model="bulkGroup" placeholder="Grup (opsional)" />
            <USelect v-model="bulkSession" :items="[{ label: '— tanpa sesi —', value: '' }, ...sessions.map((s) => ({ label: sessionLabel(s), value: s.id }))]" />
            <UButton label="Tambah Semua" :disabled="!bulkNames.length" @click="addBulk" />
          </div>
        </UCard>

        <!-- Guest list -->
        <UCard>
          <h2 class="mb-3 font-medium">Daftar Tamu ({{ guests.length }})</h2>
          <div v-if="!guests.length" class="text-sm text-gray-500">Belum ada tamu.</div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-1">Nama</th><th>Grup</th><th>Sesi</th><th>Kode</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in guests" :key="g.id" class="border-t">
                <td class="py-1">{{ g.name }}</td>
                <td>{{ g.groupLabel || '—' }}</td>
                <td>{{ sessionById(g.sessionId) ? sessionLabel(sessionById(g.sessionId)) : '—' }}</td>
                <td class="font-mono text-xs">{{ g.code }}</td>
                <td class="flex justify-end gap-1 py-1">
                  <UButton size="xs" variant="ghost" :label="copied === g.code ? 'Tersalin' : 'Salin link'" @click="copyLink(g.code)" />
                  <UButton size="xs" variant="ghost" label="WA" @click="shareWa(g.code, g.name)" />
                  <UButton size="xs" color="error" variant="ghost" label="Hapus" @click="delGuest(g.id)" />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Typecheck + full suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

> If a Nuxt UI component prop (e.g. `USelect :items` shape) trips typecheck, adjust to the v4 API used elsewhere in the codebase (see `app/pages/admin/invitations/index.vue` for `USelect`/`UInput`/`UTextarea` usage) — keep behavior identical. Do not commit with typecheck errors.

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/invitations/[id]/guests.vue
git commit -m "feat: guest management page (sessions + single/bulk guests + copy link/WA)"
```

---

## Task 10: Navigation links to the guest page

**Files:**
- Modify: `app/pages/admin/invitations/index.vue`
- Modify: `app/pages/admin/invitations/[id]/edit.vue`

- [ ] **Step 1: Add a "Tamu" link in the invitations list row**

In `app/pages/admin/invitations/index.vue`, immediately after the existing "Edit" `UButton` (the last button in each row's flex), add:

```vue
            <UButton variant="link" :to="`/admin/invitations/${inv.id}/guests`" label="Tamu" />
```

- [ ] **Step 2: Add a "Tamu" link in the editor navbar**

In `app/pages/admin/invitations/[id]/edit.vue`, in the `UDashboardNavbar` `#right` template, before the `SaveStatus`/Publish controls, add:

```vue
          <UButton variant="link" :to="`/admin/invitations/${id}/guests`" label="Tamu" />
```

- [ ] **Step 3: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/invitations/index.vue app/pages/admin/invitations/[id]/edit.vue
git commit -m "feat: link to the guest page from the invitations list and editor"
```

---

## Task 11: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 132 + the new util tests). Zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Confirm the migration exists**

Run: `ls server/db/migrations/0003_*.sql`
Expected: one file. (Remind the user to run `npm run db:migrate` against their dev DB before using the feature — not done here.)

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize phase 2c"
```

(Skip if the tree is already clean.)

---

## Self-Review (done at write time)

- **Spec §3 (schema/migration):** Task 5. ✅
- **Spec §4 (pure utils):** Task 1 (code/bulk), Task 2 (belongs), Task 3 (applyGuestSession), Task 4 (link/WA). ✅
- **Spec §5 (endpoints):** sessions → Task 6, guests → Task 7. Owner-guard + belongs predicate + bulk + session validation + delete-nulls-guests all present. ✅
- **Spec §6 (public override):** Task 8. ✅
- **Spec §7 (page UI):** Task 9 (sessions block, single + bulk add with session select, table with copy/WA/hapus, empty/disabled states). ✅
- **Spec §8 (navigation):** Task 10. ✅
- **Spec §9 (testing):** pure units Tasks 1–4; `applyGuestSession` non-mutation + null identity covered (Task 3); endpoints rely on the unit-tested predicate + `assertOwnerOr404` per the codebase's thin-shell pattern. ✅
- **Spec §11 success criteria:** 1→T7, 2→T4+T9+T8, 3→T4+T9, 4→T2+T6+T7, 5→T10, 6→T3+T5+T6+T7+T8, 7→T6 (delete nulls guests). ✅
- **Placeholder scan:** none.
- **Type consistency:** `generateGuestCode(name, rand)`, `parseBulkNames(text)`, `rowBelongsToInvitation(row,id)`, `GuestSession{targetEvent,timeStart,timeEnd}`/`applyGuestSession(sections,session)`, `buildGuestLink(origin,slug,code)`/`buildWhatsappShare(origin,slug,code,name)`, `sessions{targetEvent,timeStart,timeEnd}`, `guests.sessionId` — all used identically across tasks. ✅
- **Migration safety:** `db:generate` only in Task 5; `db:migrate` is a documented manual step (never run by a subagent — hits live Neon). ✅
- **Cache:** personalized response stays cache-safe because `?guest=<code>` is part of the edge cache key (existing behavior; unchanged). Noted, no code needed.
```

# Editable WhatsApp Message Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded WhatsApp share text with a per-invitation, editable template (stored on the invitation, edited in a "Template Pesan" modal) whose `{PLACEHOLDER}` tokens are filled from the invitation (couple name, first-event date/time) and the guest (name, personal link, session time).

**Architecture:** Pure render/extract utilities in `app/utils/wa-template.ts` (tested in isolation); a `waTemplate` column on `invitations` (migration 0004) with a code-constant fallback when empty; a thin owner-guarded PATCH endpoint; and a modal + WA-button rewiring on the existing guest page.

**Tech Stack:** Nuxt 4 (Nitro), Drizzle ORM + Neon Postgres, Zod, Vitest + @vue/test-utils, Nuxt UI v4.

**Branch:** `feat/phase-2b-media` (continuation). Dev DB is disposable — the migration needs no backward-compat handling.

**Grounding facts:**
- `app/utils/guest-link.ts` currently exports `buildGuestLink` + `buildWhatsappShare`; the guest page imports both. `buildWhatsappShare` is being **removed** and replaced by `renderWaTemplate` + `buildWhatsappUrl` in the new `wa-template.ts`. `tests/utils/guest-link.test.ts` tests both — its `buildWhatsappShare` block must be removed.
- `app/pages/admin/invitations/[id]/guests.vue` has `function shareWa(code, name) { window.open(buildWhatsappShare(window.location.origin, slug.value, code, name), '_blank') }`, the WA button `@click="shareWa(g.code, g.name)"`, it loads the invitation via `useFetch('/api/admin/invitations/:id')` (giving `slug` + `draftDocument`), has `sessionById(sid)` and `sessions`/`guests` computeds, and a header `#right` template with an "Editor" link.
- `assertOwnerOr404(inv|null, viewerId|null)` → 404; ownerId always from `session.user?.id`.
- `invitations` table is in `server/db/schema.ts`; latest migration is `0003`. `npm run db:generate` produces the next; do NOT run `db:migrate` from a subagent.
- Admin invitation GET: `server/api/admin/invitations/[id]/index.get.ts` returns `slug`, `draftDocument`, `cssVars`, `musicMediaId`, `musicUrl`, `themeTokens`, `tokenOverrides` — add `waTemplate` to it.

---

## File Structure

- Create `app/utils/wa-template.ts` — default constant + `renderWaTemplate`, `effectiveWaTemplate`, `invitationWaVars`, `formatTimeRange`, `buildWhatsappUrl`.
- Modify `app/utils/guest-link.ts` — remove `buildWhatsappShare` (keep `buildGuestLink`).
- Modify `server/db/schema.ts` — add `invitations.waTemplate`; generate migration 0004.
- Create `server/api/admin/invitations/[id]/wa-template.patch.ts`.
- Modify `server/api/admin/invitations/[id]/index.get.ts` — return `waTemplate`.
- Modify `app/pages/admin/invitations/[id]/guests.vue` — template state, modal, WA rewiring.
- Tests: `tests/utils/wa-template.test.ts` (new), `tests/utils/guest-link.test.ts` (trim).

---

## Task 1: Pure WA-template utilities

**Files:**
- Create: `app/utils/wa-template.ts`
- Modify: `app/utils/guest-link.ts`
- Test: create `tests/utils/wa-template.test.ts`; modify `tests/utils/guest-link.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/wa-template.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderWaTemplate, effectiveWaTemplate, invitationWaVars, formatTimeRange, buildWhatsappUrl, WA_TEMPLATE_DEFAULT } from '../../app/utils/wa-template'

describe('renderWaTemplate', () => {
  it('replaces all five known tokens', () => {
    const out = renderWaTemplate('Yth. {GUEST_NAME} / {COUPLE_NAME} / {DATE} / {TIME} / {URL}', {
      GUEST_NAME: 'Budi', COUPLE_NAME: 'W & D', DATE: '1 Sep 2026', TIME: '09:00 – Selesai', URL: 'https://x/u/a?guest=b',
    })
    expect(out).toBe('Yth. Budi / W & D / 1 Sep 2026 / 09:00 – Selesai / https://x/u/a?guest=b')
  })
  it('renders a missing var as empty and leaves unknown braces intact', () => {
    expect(renderWaTemplate('{GUEST_NAME} {OTHER}', { COUPLE_NAME: 'X' })).toBe(' {OTHER}')
  })
})

describe('effectiveWaTemplate', () => {
  it('falls back to the default when empty/null', () => {
    expect(effectiveWaTemplate('')).toBe(WA_TEMPLATE_DEFAULT)
    expect(effectiveWaTemplate(null)).toBe(WA_TEMPLATE_DEFAULT)
    expect(effectiveWaTemplate('   ')).toBe(WA_TEMPLATE_DEFAULT)
  })
  it('returns the stored value when non-empty', () => {
    expect(effectiveWaTemplate('Halo {GUEST_NAME}')).toBe('Halo {GUEST_NAME}')
  })
  it('default contains the placeholders and the Balinese greeting', () => {
    expect(WA_TEMPLATE_DEFAULT).toContain('{GUEST_NAME}')
    expect(WA_TEMPLATE_DEFAULT).toContain('{URL}')
    expect(WA_TEMPLATE_DEFAULT).toContain('Om Swastyastu')
  })
})

describe('invitationWaVars', () => {
  it('pulls couple name + first-event date/time', () => {
    const sections = [
      { type: 'hero', content: { coupleName: 'Willy & Debby', date: '2026-09-01' } },
      { type: 'event', content: { events: [{ name: 'Resepsi', date: '2026-09-02', timeStart: '11:00', timeEnd: '13:00' }] } },
    ]
    expect(invitationWaVars(sections)).toEqual({ coupleName: 'Willy & Debby', date: '2026-09-02', timeStart: '11:00', timeEnd: '13:00' })
  })
  it('falls back to hero date when there is no event, and tolerates empties', () => {
    const sections = [{ type: 'hero', content: { coupleName: 'A', date: '2026-09-01' } }]
    expect(invitationWaVars(sections)).toEqual({ coupleName: 'A', date: '2026-09-01', timeStart: '', timeEnd: '' })
    expect(invitationWaVars([])).toEqual({ coupleName: '', date: '', timeStart: '', timeEnd: '' })
  })
})

describe('formatTimeRange', () => {
  it('formats start/end pairs', () => {
    expect(formatTimeRange('09:00', '18:00')).toBe('09:00 – 18:00')
    expect(formatTimeRange('09:00', '')).toBe('09:00')
    expect(formatTimeRange('', '')).toBe('')
  })
})

describe('buildWhatsappUrl', () => {
  it('encodes the message', () => {
    const url = buildWhatsappUrl('Halo Budi\nLink: https://x')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.replace('https://wa.me/?text=', ''))).toBe('Halo Budi\nLink: https://x')
  })
})
```

Also edit `tests/utils/guest-link.test.ts`: **remove** the entire `describe('buildWhatsappShare', …)` block and the `buildWhatsappShare` import, leaving only the `buildGuestLink` import + test:

```ts
import { describe, it, expect } from 'vitest'
import { buildGuestLink } from '../../app/utils/guest-link'

describe('buildGuestLink', () => {
  it('builds the personalized invitation URL', () => {
    expect(buildGuestLink('https://lovree.com', 'elrumi', 'budi-x7k2')).toBe('https://lovree.com/u/elrumi?guest=budi-x7k2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/wa-template.test.ts tests/utils/guest-link.test.ts`
Expected: FAIL — `wa-template.ts` does not exist; `guest-link.ts` still exports `buildWhatsappShare` but the test no longer imports it (the wa-template file is the failing one).

- [ ] **Step 3: Create `app/utils/wa-template.ts`**

```ts
export const WA_TEMPLATE_DEFAULT = `Yth. {GUEST_NAME}

The Wedding of💍
{COUPLE_NAME}

Om Swastyastu

Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa/ Tuhan Yang Maha Esa, kami mengundang Bapak/Ibu/Saudara/i pada Resepsi Pawiwahan kami yang dilaksanakan pada :

Hari / Tanggal : {DATE}
Pukul : {TIME}

Untuk lebih lengkapnya bisa dilihat pada link undangan di bawah ini:
{URL}

Demikianlah undangan ini kami sampaikan, atas kehadiran dan doa restu Bapak/Ibu/Saudara/i kami ucapkan terima kasih.

Om Santih Santih Santih Om`

export type WaVars = { GUEST_NAME: string; COUPLE_NAME: string; DATE: string; TIME: string; URL: string }

// Replace only the 5 known tokens; missing var → empty; other {braces} untouched.
export function renderWaTemplate(template: string, vars: Partial<WaVars>): string {
  return template.replace(/\{(GUEST_NAME|COUPLE_NAME|DATE|TIME|URL)\}/g, (_, k: string) => (vars as any)[k] ?? '')
}

// Effective template = stored override or the default constant.
export function effectiveWaTemplate(stored: string | null | undefined): string {
  return stored && stored.trim().length > 0 ? stored : WA_TEMPLATE_DEFAULT
}

// Couple name + first-event date/time from the rendered sections.
export function invitationWaVars(sections: any[]): { coupleName: string; date: string; timeStart: string; timeEnd: string } {
  const hero = (sections ?? []).find((s) => s.type === 'hero')?.content ?? {}
  const firstEvent = (sections ?? []).find((s) => s.type === 'event')?.content?.events?.[0] ?? {}
  return {
    coupleName: hero.coupleName ?? '',
    date: firstEvent.date || hero.date || '',
    timeStart: firstEvent.timeStart ?? '',
    timeEnd: firstEvent.timeEnd ?? '',
  }
}

export function formatTimeRange(timeStart: string, timeEnd: string): string {
  if (!timeStart && !timeEnd) return ''
  return timeEnd ? `${timeStart} – ${timeEnd}` : timeStart
}

export function buildWhatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 4: Remove `buildWhatsappShare` from `app/utils/guest-link.ts`**

The file should end up as ONLY:

```ts
export function buildGuestLink(origin: string, slug: string, code: string): string {
  return `${origin}/u/${slug}?guest=${encodeURIComponent(code)}`
}
```

(Delete the `buildWhatsappShare` function entirely. The guest page is rewired in Task 5; until then it still imports the removed symbol, but that file is not imported by any test, so the suite stays green. Typecheck is run at Task 5 after the page is fixed.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/utils/wa-template.test.ts tests/utils/guest-link.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/utils/wa-template.ts app/utils/guest-link.ts tests/utils/wa-template.test.ts tests/utils/guest-link.test.ts
git commit -m "feat: WA message template render/extract utils; split buildWhatsappShare out"
```

---

## Task 2: Schema — `invitations.waTemplate` (migration 0004)

**Files:**
- Modify: `server/db/schema.ts`
- Generated: `server/db/migrations/0004_*.sql`

- [ ] **Step 1: Add the column**

In `server/db/schema.ts`, in the `invitations` table definition, add (e.g. after `tokenOverrides` or `musicMediaId`):

```ts
  waTemplate: text('wa_template').notNull().default(''),
```

(`text` is already imported in this file.)

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: creates `server/db/migrations/0004_*.sql` (ALTER TABLE invitations ADD COLUMN wa_template …). Confirm:
Run: `ls server/db/migrations/0004_*.sql`

> Do NOT run `npm run db:migrate` (the user applies it).

- [ ] **Step 3: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors. (The guest page still references the removed `buildWhatsappShare` here — it is fixed in Task 5. If typecheck reports ONLY that error, that is expected at this point; note it and proceed. Confirm there are no OTHER new errors.)

- [ ] **Step 4: Commit**

```bash
git add server/db/schema.ts server/db/migrations/
git commit -m "feat: invitations.waTemplate column (migration 0004)"
```

---

## Task 3: `PATCH /wa-template` endpoint

**Files:**
- Create: `server/api/admin/invitations/[id]/wa-template.patch.ts`
- Test: none new (owner-guard via `assertOwnerOr404`, already tested; verified by typecheck + Task 6).

- [ ] **Step 1: Create the endpoint**

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'

const body = z.object({ template: z.string() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })

  await db.update(invitations).set({ waTemplate: parsed.data.template, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, waTemplate: parsed.data.template }
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors referencing `wa-template.patch.ts` (the pre-existing guest-page error from Task 1/2 may still show — fixed in Task 5).

- [ ] **Step 3: Commit**

```bash
git add "server/api/admin/invitations/[id]/wa-template.patch.ts"
git commit -m "feat: PATCH /wa-template endpoint (owner-guarded)"
```

---

## Task 4: Editor GET returns `waTemplate`

**Files:**
- Modify: `server/api/admin/invitations/[id]/index.get.ts`
- Test: none new.

- [ ] **Step 1: Add `waTemplate` to the response**

In `server/api/admin/invitations/[id]/index.get.ts`, the handler loads `inv` (full row via `db.select().from(invitations)…`). Add `waTemplate` to the returned object alongside the other fields:

```ts
    waTemplate: inv!.waTemplate,
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors (besides the pre-existing guest-page error fixed in Task 5).

- [ ] **Step 3: Commit**

```bash
git add "server/api/admin/invitations/[id]/index.get.ts"
git commit -m "feat: editor GET returns waTemplate"
```

---

## Task 5: Guest page — template modal + WA rewiring

**Files:**
- Modify: `app/pages/admin/invitations/[id]/guests.vue`
- Test: none new (integration page; pure logic covered by Task 1; verified by typecheck + Task 6).

- [ ] **Step 1: Update the script imports + state**

In `app/pages/admin/invitations/[id]/guests.vue`, change the guest-link import line:

```ts
import { buildGuestLink } from '~/utils/guest-link'
import { effectiveWaTemplate, renderWaTemplate, invitationWaVars, formatTimeRange, buildWhatsappUrl } from '~/utils/wa-template'
```

After the existing `slug`/`eventNames` computeds (near the top of `<script setup>`), add the template state:

```ts
const template = ref(effectiveWaTemplate((inv.value as any)?.waTemplate))
const templateOpen = ref(false)
const templateDraft = ref('')
function openTemplate() { templateDraft.value = template.value; templateOpen.value = true }
async function saveTemplate() {
  await $fetch(`/api/admin/invitations/${id}/wa-template`, { method: 'PATCH', body: { template: templateDraft.value } })
  template.value = effectiveWaTemplate(templateDraft.value)
  templateOpen.value = false
}
```

- [ ] **Step 2: Replace the `shareWa` function**

Replace the existing:

```ts
function shareWa(code: string, name: string) {
  window.open(buildWhatsappShare(window.location.origin, slug.value, code, name), '_blank')
}
```

with:

```ts
function shareWa(g: any) {
  const base = invitationWaVars(((inv.value as any)?.draftDocument?.sections) ?? [])
  const sess = sessionById(g.sessionId)
  const ts = sess ? sess.timeStart : base.timeStart
  const te = sess ? sess.timeEnd : base.timeEnd
  const vars = {
    GUEST_NAME: g.name,
    COUPLE_NAME: base.coupleName,
    DATE: base.date,
    TIME: formatTimeRange(ts, te),
    URL: buildGuestLink(window.location.origin, slug.value, g.code),
  }
  window.open(buildWhatsappUrl(renderWaTemplate(effectiveWaTemplate(template.value), vars)), '_blank')
}
```

- [ ] **Step 3: Add the "Template Pesan" button + modal in the template**

In the header `#right` template, add a button before the existing "Editor" link:

```vue
          <UButton variant="link" label="Template Pesan" @click="openTemplate" />
```

Update the WA button in the guest table row from `@click="shareWa(g.code, g.name)"` to:

```vue
                  <UButton size="xs" variant="ghost" label="WA" @click="shareWa(g)" />
```

Add the modal at the end of the `#body` content (inside the outer `<div class="space-y-6">` or right after it, still within `#body`):

```vue
        <UModal v-model:open="templateOpen" title="Template Pesan WhatsApp">
          <template #body>
            <p class="mb-2 text-xs text-gray-500">Placeholder: {GUEST_NAME} {COUPLE_NAME} {DATE} {TIME} {URL}</p>
            <UTextarea v-model="templateDraft" :rows="14" class="w-full" />
            <div class="mt-3 flex justify-end gap-2">
              <UButton variant="ghost" label="Batal" @click="templateOpen = false" />
              <UButton label="Simpan" @click="saveTemplate" />
            </div>
          </template>
        </UModal>
```

- [ ] **Step 4: Typecheck + full suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors (the earlier `buildWhatsappShare` reference is now gone).
Run: `npx vitest run`
Expected: all pass.

> If the Nuxt UI v4 `UModal` API differs (e.g. `v-model:open` vs `v-model`, or the slot name), adjust minimally to the version installed — keep the open/close + Simpan/Batal behavior identical. Do not commit with typecheck errors.

- [ ] **Step 5: Commit**

```bash
git add "app/pages/admin/invitations/[id]/guests.vue"
git commit -m "feat: editable WA template modal + per-guest template rendering"
```

---

## Task 6: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 144 + the new wa-template cases; the removed `buildWhatsappShare` test is gone). Zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Confirm no stray `buildWhatsappShare` references + migration exists**

Run:
```bash
grep -rn "buildWhatsappShare" app/ server/ tests/ || echo "none (clean)"
ls server/db/migrations/0004_*.sql
```
Expected: "none (clean)" and one migration file.

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize WA template feature"
```

(Skip if the tree is already clean. Remind the user to run `npm run db:migrate` before using the feature.)

---

## Self-Review (done at write time)

- **Spec §3 (waTemplate column / migration):** Task 2. ✅
- **Spec §4 (default constant):** Task 1. ✅
- **Spec §5 (pure utils):** Task 1 — `renderWaTemplate`, `effectiveWaTemplate`, `invitationWaVars`, `formatTimeRange`, `buildWhatsappUrl`; `buildWhatsappShare` removed. ✅
- **Spec §6 (endpoint + GET):** Task 3 (PATCH) + Task 4 (GET returns waTemplate). ✅
- **Spec §7 (UI: modal + WA rewiring with session time):** Task 5. ✅
- **Spec §8 (testing):** pure units Task 1 (all five helpers + default); endpoint relies on `assertOwnerOr404` per the thin-shell pattern. ✅
- **Spec §10 success criteria:** 1→T5 (+T1 default), 2→T5 (+T1 render, session time), 3→T1 `effectiveWaTemplate` fallback, 4→T1 fallback + T5 save-empty. ✅
- **Placeholder scan:** none.
- **Type consistency:** `renderWaTemplate(template, vars)`, `effectiveWaTemplate(stored)`, `invitationWaVars(sections)→{coupleName,date,timeStart,timeEnd}`, `formatTimeRange(ts,te)`, `buildWhatsappUrl(message)`, `WaVars` keys (`GUEST_NAME` etc.) — identical across Task 1 and Task 5. ✅
- **Ordering note for the implementer:** Tasks 1–4 leave one expected typecheck error in `guests.vue` (it still references the removed `buildWhatsappShare`); it is resolved in Task 5. Each of Tasks 2–4 says to confirm no *other* new error. The full suite stays green throughout because no test imports `guests.vue`.
- **Migration safety:** `db:generate` only (Task 2); `db:migrate` is the user's manual step. ✅
```

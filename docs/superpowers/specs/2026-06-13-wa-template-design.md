# Lovree v3 — Design Spec: WhatsApp Message Template (editable per invitation)

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** Phase 2c (guest management + WhatsApp share). Same branch `feat/phase-2b-media`.
- **Scope:** Replace the hardcoded WhatsApp share text with an editable, per-invitation template stored on the invitation, edited in a "Template Pesan" modal, with `{PLACEHOLDER}` tokens auto-filled from the invitation (couple name, event date/time) and the guest (name, personal link, session time). One new column (migration 0004), one PATCH endpoint, pure render/extract utilities, a modal on the guest page.

## 1. Background & Goal

Phase 2c added a per-guest WhatsApp share with a fixed Indonesian message baked into `buildWhatsappShare`. Customers want to control that wording (e.g. a Balinese Hindu invitation has a specific religious greeting) and have it personalized per guest. This spec makes the message a stored, editable template with placeholder substitution.

**Goal:** From the guest page, a customer opens a "Template Pesan" modal pre-filled with a sensible default, edits the wording (keeping `{PLACEHOLDER}` tokens), and saves it; each guest's "WA" button then opens WhatsApp with that template rendered for that guest.

## 2. Decisions carried in from brainstorming

- **Placeholders:** `{GUEST_NAME}`, `{COUPLE_NAME}`, `{DATE}`, `{TIME}`, `{URL}`.
- **Sources:** `{GUEST_NAME}` = the guest's name; `{COUPLE_NAME}` = hero `coupleName`; `{DATE}` = the first event's `date` (fallback hero `date`); `{TIME}` = the guest's **session** time if the guest has one, else the first event's `timeStart`–`timeEnd`; `{URL}` = the guest's personal link.
- **Storage:** new column `invitations.waTemplate text not null default ''`. **Effective template = stored value if non-empty, else the code constant `WA_TEMPLATE_DEFAULT`** — so existing invitations fall back to the default with no data backfill, and the modal pre-fills with the effective template. (Dev DB is disposable, so the migration is unconstrained.)
- **Default template:** the Balinese Hindu reception text the customer supplied (see §4).

## 3. Data model (migration 0004)

Add to the `invitations` table:
```ts
waTemplate: text('wa_template').notNull().default(''),
```
Generate with `drizzle-kit generate` (migration `0004`). No data migration needed (empty default + code fallback).

## 4. Default template constant

`app/utils/wa-template.ts`:
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
```

## 5. Pure utilities (`app/utils/wa-template.ts`)

```ts
export type WaVars = { GUEST_NAME: string; COUPLE_NAME: string; DATE: string; TIME: string; URL: string }

// Replace only the 5 known tokens; a missing var → empty string; any other
// {braces} in the text are left untouched.
export function renderWaTemplate(template: string, vars: Partial<WaVars>): string {
  return template.replace(/\{(GUEST_NAME|COUPLE_NAME|DATE|TIME|URL)\}/g, (_, k: string) => (vars as any)[k] ?? '')
}

// Effective template = stored override or the default constant.
export function effectiveWaTemplate(stored: string | null | undefined): string {
  return stored && stored.trim().length > 0 ? stored : WA_TEMPLATE_DEFAULT
}

// Pull couple name + first-event date/time from the rendered sections.
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

// Format a start/end pair as "09:00 – 18:00" / "09:00" / "".
export function formatTimeRange(timeStart: string, timeEnd: string): string {
  if (!timeStart && !timeEnd) return ''
  return timeEnd ? `${timeStart} – ${timeEnd}` : timeStart
}

export function buildWhatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
```

The existing `buildGuestLink` (in `app/utils/guest-link.ts`) is reused for `{URL}`. The old `buildWhatsappShare` is removed (replaced by `renderWaTemplate` + `buildWhatsappUrl`); its test is updated to the new functions.

## 6. Endpoint

`PATCH /api/admin/invitations/:id/wa-template`:
- Body Zod `{ template: z.string() }` (any string, including empty — empty means "reset to default" via the fallback).
- `assertOwnerOr404` (owner check → 404; ownerId from session).
- `db.update(invitations).set({ waTemplate: template, updatedAt })`.
- Returns `{ ok: true, waTemplate: template }`.

The admin invitation GET (`server/api/admin/invitations/[id]/index.get.ts`) adds `waTemplate: inv.waTemplate` to its response so the guest page can load the stored value.

## 7. Guest page UI

In `app/pages/admin/invitations/[id]/guests.vue`:
- Load `waTemplate` from the invitation GET; hold `const template = ref(effectiveWaTemplate(inv.waTemplate))`.
- **"Template Pesan" button** (in the page header / near the title) → opens a `UModal` with a `UTextarea` bound to a draft copy of `template`, a small hint line listing the available placeholders (`{GUEST_NAME} {COUPLE_NAME} {DATE} {TIME} {URL}`), and **Simpan** / **Batal**. Simpan → `PATCH …/wa-template { template: draft }`, set `template.value = draft`, close. (Saving an empty textarea persists `''`; the page then re-derives the effective default.)
- **Per-guest "WA" action** composes the message:
  - `base = invitationWaVars(draftDocument.sections)` (couple name, first-event date, first-event time).
  - If the guest has a `sessionId`, look up that session (already loaded on the page) and use its `timeStart`/`timeEnd` for the time; else use `base.timeStart`/`base.timeEnd`.
  - `vars = { GUEST_NAME: g.name, COUPLE_NAME: base.coupleName, DATE: base.date, TIME: formatTimeRange(ts, te), URL: buildGuestLink(window.location.origin, slug, g.code) }`.
  - `window.open(buildWhatsappUrl(renderWaTemplate(effectiveWaTemplate(template.value), vars)), '_blank')`.

(`draftDocument.sections` is already loaded on the guest page for event names; `invitationWaVars` reads the same source.)

## 8. Testing

- **Pure:** `renderWaTemplate` replaces all five tokens, leaves unknown `{braces}` intact, and renders a missing var as empty. `effectiveWaTemplate('')`/`null` → default; non-empty → the stored value. `invitationWaVars` extracts couple name + first-event date/time with the hero/date fallbacks. `formatTimeRange` → `"09:00 – 18:00"`, `"09:00"`, `""`. `buildWhatsappUrl` encodes the message.
- **Endpoint:** owner-guard 404 (via `assertOwnerOr404`, already tested); valid template persists; empty template persists (and the page falls back to default).
- **Component (optional/light):** the modal saves the draft via PATCH and updates the active template.

## 9. Out of Scope

- Per-event or per-section additional placeholders beyond the five listed.
- Rich-text / formatting helpers (it is plain WhatsApp text).
- Sending WhatsApp automatically (the share still opens the app with prefilled text).
- A separate per-guest template override (one template per invitation).

## 10. Success Criteria

1. "Template Pesan" opens a modal pre-filled with the default Balinese text (or the saved override); editing and Simpan persists it.
2. Each guest's "WA" button opens WhatsApp with the template rendered: name, couple name, date, time (the guest's session time when assigned, else the first event's), and the guest's personal link.
3. An invitation that has never set a template uses the default automatically.
4. Saving an empty template resets the effective message to the default.

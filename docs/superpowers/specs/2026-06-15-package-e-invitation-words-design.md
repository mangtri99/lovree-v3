# Lovree v3 — Design Spec: Package E — Invitation Words + Create Modal

- **Date:** 2026-06-15
- **Status:** Approved for planning
- **Builds on:** Per-type starters, Package A (closing greeting). Same branch `feat/phase-2b-media`.
- **Scope:** A global "Invitation Word" library (reusable default wording, CRUD via a sidebar menu) and a modal create-invitation form that requires title, slug, type, theme, and a chosen Invitation Word whose copy seeds the new invitation. (Package E of the UPDATE.md basket; items 8 + 9.)

## 1. Background & Goal

Creating an invitation auto-generates the slug from the title and seeds generic per-type starter copy; there is no way to manage reusable wording. 

**Goal:** A catalog of "Invitation Words" (per type: opening greeting/body, closing greeting/body, quote/source) the admin manages; the create form is a modal where the customer sets the title, a custom slug, type, theme, and picks an Invitation Word — its wording seeds the new invitation's opening/closing/quote sections (still editable in the editor).

## 2. Decisions carried in from brainstorming

- **Invitation Words are global** (no owner) — a shared base catalog; any logged-in user can CRUD (single-user model; revisit with roles later).
- **Create form: all fields required**, including the Invitation Word; the word dropdown is **filtered by the selected type**. Default words are seeded so the dropdown is never empty.
- **Slug is user-provided** (auto-suggested from the title, editable), normalized with `slugify`, and **unique** (409 on conflict).
- The word seeds **only its non-empty fields**; empty word fields fall back to the type's existing starter copy.

## 3. Schema (migration 0007)

```ts
export const invitationWords = pgTable('invitation_words', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  openingGreeting: text('opening_greeting').notNull().default(''),
  openingBody: text('opening_body').notNull().default(''),
  closingGreeting: text('closing_greeting').notNull().default(''),
  closingBody: text('closing_body').notNull().default(''),
  quote: text('quote').notNull().default(''),
  quoteSource: text('quote_source').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

## 4. Seeding with a word (`server/registry/starter-sections.ts`)

Extend `starterDocument` to accept an optional word and a pure helper:
```ts
export interface InvitationWordContent {
  openingGreeting?: string; openingBody?: string
  closingGreeting?: string; closingBody?: string
  quote?: string; quoteSource?: string
}

// Maps a word's non-empty fields onto section content overrides.
export function wordToContent(word: InvitationWordContent): Partial<Record<SectionType, Record<string, any>>> {
  const opening: Record<string, any> = {}
  if (word.openingGreeting) opening.greeting = word.openingGreeting
  if (word.openingBody) opening.body = word.openingBody
  const closing: Record<string, any> = {}
  if (word.closingGreeting) closing.greeting = word.closingGreeting
  if (word.closingBody) closing.body = word.closingBody
  const quote: Record<string, any> = {}
  if (word.quote) quote.text = word.quote
  if (word.quoteSource) quote.source = word.quoteSource
  return { opening, closing, quote }
}

export function starterDocument(type: string, word?: InvitationWordContent | null): InvitationDocument {
  const cfg = STARTER_CONFIG[type] ?? STARTER_CONFIG.wedding!
  const wo = word ? wordToContent(word) : {}
  return {
    sections: cfg.sections.map((t) => ({
      id: nanoid(),
      type: t,
      enabled: true,
      content: validateContent(t, { ...(cfg.content?.[t] ?? {}), ...((wo as any)[t] ?? {}) }),
    })),
  }
}
```
A word override only applies to sections present in the type's starter (e.g. birthday has no `quote` section → its quote override is ignored). `validateContent` keeps everything schema-valid.

## 5. CRUD endpoints (`server/api/admin/invitation-words`)

Auth: `session.user?.id` else 401. Global (no owner scoping).
- **`GET …/invitation-words`** → `{ words: [...] }` (all fields), newest first. Supports an optional `?type=` query to filter.
- **`POST …/invitation-words`** → Zod body `{ name (min 1), type (enum of the 5 types), openingGreeting?, openingBody?, closingGreeting?, closingBody?, quote?, quoteSource? }` (text fields default `''`, max ~2000 each). Insert; return the row.
- **`PATCH …/invitation-words/:id`** → same body (partial); update; 404 if missing.
- **`DELETE …/invitation-words/:id`** → delete; 404 if missing. (Deleting a word does not affect already-created invitations — the wording was copied into their document.)

## 6. Create-invitation endpoint update

`server/api/admin/invitations/index.post.ts`:
- Body becomes `{ title (min 1), slug (min 1), type (enum), themeId (uuid), invitationWordId (uuid) }` — slug + themeId + invitationWordId now **required**.
- Normalize: `const slug = slugify(parsed.data.slug)`; if empty after slugify → 400.
- **Uniqueness:** `SELECT 1 FROM invitations WHERE slug = :slug`; if found → `409 { message: 'Slug sudah dipakai' }`.
- Verify the theme exists (existing behavior) and load the Invitation Word by id (404/400 if missing).
- `draftDocument: starterDocument(type, word)`.
- Return `{ id, slug }`.

## 7. Create form modal (`app/pages/admin/invitations/index.vue`)

- Replace the inline `<form>` with a "Buat Undangan" button that opens a `UModal`.
- Fields (all required): **Judul** (`UInput`), **Slug** (`UInput` + helper text "slug akan digunakan sebagai url undangan"; auto-suggested as `slugify(title)` until the user edits it manually), **Tipe** (`USelect`), **Tema** (`USelect` from `GET /api/admin/themes`), **Template Konten** (`USelect` from `GET /api/admin/invitation-words?type=<tipe>`, label = word name; re-fetched/filtered when the type changes).
- Submit posts `{ title, slug, type, themeId, invitationWordId }`; on success navigate to the editor; on 409 show "Slug sudah dipakai" inline; disable submit until all required fields are set.

## 8. Invitation Word admin page (`app/pages/admin/invitation-words.vue`) + nav

- Sidebar nav item "Invitation Word" (`i-lucide-book-text`, `/admin/invitation-words`) in `app/layouts/admin.vue`.
- Page: a list (name + type + edit/delete) and a form (the 8 fields) to create/edit a word (`POST`/`PATCH`), with delete. Empty-state hint.

## 9. Seeding defaults (`server/db/seed.ts`)

Insert a few `invitation_words` (at least one per type) drawn from the existing per-type starter copy, so the create dropdown is populated after a seed.

## 10. Testing

- **Pure:** `wordToContent` maps non-empty fields, omits empty ones. `starterDocument('wedding', word)` overrides opening/closing/quote with the word's text; empty word fields keep the type default; `starterDocument('wedding')` (no word) is unchanged; a word's `quote` override is ignored for a type without a quote section (e.g. baby_3mo). All seeded content is schema-valid.
- **Endpoints:** `POST /invitations` rejects a duplicate slug (409) and a missing slug (400); `GET/POST/PATCH/DELETE /invitation-words` require auth (401 without session). (Guard/validation level, thin-shell convention.)
- **Component:** the create modal disables submit until required fields are set and filters the word dropdown by type; the Invitation Word page lists words and the delete/save actions call the right endpoints (mock `$fetch`).
- Full suite green; typecheck clean.

## 11. Out of Scope

- Per-user/private Invitation Words; role-gated CRUD.
- Words seeding sections beyond opening/closing/quote.
- Packages B (hero media), C (footer rich text), D (SEO).

## 12. Success Criteria

1. The Invitation Word menu lets the admin create/edit/delete words with all eight fields.
2. The create-invitation form is a modal with required title, slug (+ helper), type, theme, and Invitation Word (filtered by type); the chosen word's wording seeds the new invitation's opening/closing/quote.
3. The slug is user-defined and unique (409 on conflict); empty word fields fall back to the type's default starter copy.
4. Deleting a word does not change already-created invitations.

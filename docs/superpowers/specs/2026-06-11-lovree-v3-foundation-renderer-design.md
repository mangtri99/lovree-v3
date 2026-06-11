# Lovree v3 — Design Spec: Phase 0 (Foundation) + Phase 1 (Public Renderer)

- **Date:** 2026-06-11
- **Status:** Approved for planning
- **Scope of this spec:** Phase 0 + Phase 1 only. Editor (Phase 2), Guests/RSVP (Phase 3), and Advanced (Phase 4) are referenced for context but specced separately later.

## 1. Background & Goal

Lovree is an online wedding/event invitation product. The current system (Laravel + Livewire + MySQL) hardcodes each theme as bespoke code, and per-customer feature requests are satisfied by adding conditionals into theme code. This makes the codebase progressively unmaintainable.

**Goal of v3:** Rebuild on Nuxt 4 + Drizzle/Neon Postgres so that invitation structure, content, and styling are **data**, not code. Adding a section, field, theme, or invitation type means adding a registry entry + a dumb component — never a per-customer conditional.

The full product is decomposed into phases. This spec covers the first two:

- **Phase 0 — Foundation:** project setup, DB schema, auth, design-token system, section/field registry, storage adapter.
- **Phase 1 — Public Renderer:** render a published invitation at `/u/:slug` from data, with one working theme, cover modal + music, and all MVP section types rendering read-only.

Phases 2–4 (form-based editor with live preview, guest list + RSVP write path, additional themes + drag reorder + remaining invitation types) are out of scope here.

## 2. Tech Stack

- **Framework:** Nuxt 4 (SSR via Nitro)
- **Styling:** Tailwind CSS + design tokens exposed as CSS custom properties
- **DB:** Neon Postgres via Drizzle ORM
- **Object storage:** Cloudflare R2 (S3-compatible) behind a storage adapter interface
- **Deploy:** Vercel (Nitro Vercel preset)
- **Routing:** Path-based — `/u/:slug` for public invitations, `/admin/*` for admin (admin UI itself is Phase 2; Phase 0 only sets up auth + route protection)

## 3. Architecture Overview

Single Nuxt app, three logical areas:

- **Public renderer** — `pages/u/[slug].vue` + Nitro server route to resolve invitation data, SSR.
- **Admin** — `/admin/*`, auth + route protection scaffolded in Phase 0; full editor in Phase 2.
- **API** — Nitro routes under `server/api/*` for data access and (later) mutations.

Keystone principle: an **invitation is an ordered list of typed section instances**. Each section instance references a registry-defined `type`, carries a JSONB `content` blob validated against that type's schema, an `enabled` flag, `position`, and optional `field_overrides`. Section types repeat freely (e.g. two galleries) and reorder via `position`.

Data split:
- **Relational (Drizzle tables):** anything queried/filtered/joined — users, invitations, sections, guests, rsvps, themes, media.
- **JSONB (validated against code-side registry):** flexible structure/content — `sections.content`, `sections.field_overrides`, `invitations.token_overrides`, `themes.tokens`.
- **No EAV table** for dynamic fields. Field definitions live in the code registry; field *values* live in `sections.content` JSONB.

## 4. Data Model

### 4.1 Relational tables (Drizzle)

```
users
  id            uuid pk
  email         text unique not null
  password_hash text not null
  name          text
  created_at    timestamptz default now()

invitations
  id              uuid pk
  owner_id        uuid → users.id not null
  slug            text unique not null
  type            text not null   -- wedding | metatah | wedding_metatah | baby_3mo | birthday
  theme_id        uuid → themes.id not null
  token_overrides jsonb default '{}'
  status          text not null default 'draft'  -- draft | published
  music_media_id  uuid → media.id nullable
  created_at      timestamptz default now()
  updated_at      timestamptz default now()

sections
  id              uuid pk
  invitation_id   uuid → invitations.id not null
  type            text not null   -- registry key: hero | gallery | countdown | love_gift | ...
  position        integer not null
  enabled         boolean not null default true
  content         jsonb not null default '{}'
  field_overrides jsonb default '{}'
  -- index on (invitation_id, position)

guests
  id            uuid pk
  invitation_id uuid → invitations.id not null
  name          text not null
  code          text not null   -- used in ?guest=<code>; unique within invitation
  group_label   text
  created_at    timestamptz default now()
  -- unique (invitation_id, code)

rsvps
  id            uuid pk
  invitation_id uuid → invitations.id not null
  guest_id      uuid → guests.id nullable
  name          text not null
  attendance    text            -- yes | no | maybe
  message       text
  created_at    timestamptz default now()

themes
  id            uuid pk
  name          text not null
  tokens        jsonb not null  -- default design tokens for this theme
  preview_image text

media
  id            uuid pk
  invitation_id uuid → invitations.id not null
  type          text not null   -- image | audio   (video is YouTube embed, not stored here)
  r2_key        text not null
  url           text not null
  meta          jsonb default '{}'  -- width/height/duration/etc
  created_at    timestamptz default now()
```

Notes:
- `guests` and `rsvps` tables are created in Phase 0 (schema) but only *read* paths relevant to rendering are exercised before Phase 3. Their write/admin flows belong to Phase 3.
- `music_media_id` on `invitations` points at the audio track played when the cover opens.

### 4.2 JSONB shapes (validated by registry)

- `sections.content` — values keyed by the section type's field schema. Example Hero: `{ "title": "...", "coupleName": "...", "date": "2026-09-01" }`. Example Gallery: `{ "items": [ { "type": "image", "mediaId": "..." }, { "type": "youtube", "videoId": "dQw4w9WgXcQ" } ] }`. **Video items store a YouTube video ID, not an R2 media reference** — videos are uploaded to YouTube and embedded.
- `sections.field_overrides` — customer-added/removed generic fields (Phase 2 writes these; Phase 1 must tolerate them on read).
- `invitations.token_overrides` — whitelisted token overrides layered above theme tokens.
- `themes.tokens` — the theme's default token set (see §6).

Validation: each registry section type defines a schema (Zod). On read, `content` is parsed/validated; invalid/missing fields fall back to schema defaults so a malformed blob never crashes the renderer.

## 5. Registry (code, not DB)

Two registries live in code and are the single source of truth for what sections/fields exist.

```ts
// section registry
sectionRegistry = {
  hero:       { schema: ZodSchema, component: HeroSection,      label, defaultContent },
  opening:    { ... },   // Salam + Ucapan Pembuka
  couple:     { ... },   // Foto pasangan + data diri
  event:      { ... },   // Detail acara + maps
  countdown:  { ... },
  quote:      { ... },
  love_gift:  { ... },
  gallery:    { ... },
  closing:    { ... },
  info:       { ... },   // No tlp, sosmed
  rsvp:       { ... },   // Form ucapan & doa (write path = Phase 3)
  guestbook:  { ... },   // Daftar tamu (read path = Phase 3 data)
  footer:     { ... },
}

// generic field types (used by field schemas + Phase 2 custom fields)
fieldTypes = { text, longtext, image, date, list, url, youtube, ... }
// youtube = stores a YouTube video ID, rendered as an embed (no R2 upload)
```

- Special items (countdown, Google Maps embed, video, RSVP, Love Gift) are **section types** for MVP, each with its own content schema and component. Generic "embed-as-field" is deferred to Phase 4.
- **Video = YouTube embed.** Customers upload video to YouTube; the registry stores only a YouTube video ID and renders an `<iframe>` (lite-embed/facade for performance). No video files in R2. The `youtube` field type holds a video ID and is usable both as a standalone video section and as a Gallery item.
- Adding a new section type or invitation type = add a registry entry + a component. No per-customer branching anywhere.

## 6. Design Tokens & Theming

Tokens resolve in a cascade (later wins):

```
1. Base tokens          (global defaults / fallback, in code)
2. Theme tokens         themes.tokens
3. Invitation overrides invitations.token_overrides  (whitelisted subset)
```

Resolved tokens are injected as CSS custom properties on the invitation root during SSR:

```html
<div class="invitation"
     style="--color-primary:#8b5e3c; --font-heading:'Cormorant'; ...">
```

Token shape (example):
```
{
  color:    { primary, secondary, bg, text, accent },
  font:     { heading, body },
  radius:   { sm, md, lg },
  ornament: { motif, divider }
}
```

- Components read themed values via CSS vars (`text-[color:var(--color-primary)]`, `font-[family-name:var(--font-heading)]`). Tailwind still handles layout/spacing; tokens cover only themed properties.
- **Override whitelist (relevant from Phase 2, but the resolver is built in Phase 0):** `color.primary`, `color.secondary`, `font.heading`, `font.body`, background photo. Everything else locks to the theme.
- Fonts: only the fonts referenced by resolved `font.*` tokens are loaded (Google Fonts or self-hosted via R2), to avoid unnecessary weight.
- A new theme = insert a `themes` row (+ optional ornament assets). No `if theme === 'x'` anywhere.

Phase 1 ships **one** working theme end-to-end (seeded into `themes`).

## 7. Public Renderer (Phase 1)

### 7.1 Resolution

`GET /u/:slug`:
1. Nitro server route loads `invitation` by `slug`, plus its `sections` (ordered by `position`, `enabled = true`), plus the referenced `theme`, plus referenced `media` (incl. music track).
2. If `status = 'draft'` and requester is not the owner → **404**.
3. Query string `?guest=<code>` (or `?guest=Nama+Tamu`) resolves a guest name for cover personalization. Unknown/missing guest → render a neutral cover (e.g. "Tamu Undangan"). Guest *write* paths are Phase 3; Phase 1 only reads/resolves the name for display.

### 7.2 Render flow

1. Resolve invitation + ordered sections + theme (server).
2. Inject resolved CSS token vars on the invitation root (SSR).
3. Render **Cover** modal covering the full screen — title, couple name, guest name.
4. On "Buka Undangan" click:
   - cover fades out, scroll unlocks
   - `<audio loop>` for the music track starts (the click is the user gesture that satisfies browser autoplay rules)
5. Render section instances in `position` order, each via its registry-mapped component.

### 7.3 Section components

- One Vue component per section type. Components are **dumb**: receive validated `content` + read tokens, render markup. No per-customer logic.
- `type → component` mapping comes from the registry.
- Phase 1 implements read-only components for all MVP section types listed in §5. `rsvp` renders the form UI but submission is wired in Phase 3; `guestbook` renders an empty/seeded list until Phase 3 supplies live data.

### 7.4 Media

- Image and audio URLs come from `media` (R2). Images use Nuxt Image for lazy loading + responsive `srcset` (mobile-first; invitation traffic is bursty on phones).
- Video is a YouTube `<iframe>` embed rendered from a stored video ID (lite-embed facade: show thumbnail first, load the iframe on click to keep the page light).

### 7.5 Performance / caching

- Published invitations change rarely → cache the SSR response, revalidate on save (save path lands in Phase 2; Phase 1 sets up the cache key/strategy so later invalidation is straightforward).

## 8. Auth (Phase 0)

- Email + password, `password_hash` (argon2/bcrypt) in `users`.
- Server-side session (httpOnly cookie). Route protection middleware for `/admin/*`.
- Phase 0 delivers: signup/login/logout endpoints + session + `/admin` route guard + a placeholder authed `/admin` dashboard page. Full admin UI/editor is Phase 2.
- Ownership: `invitations.owner_id`. One account → many invitations. Draft visibility check in the renderer uses the session owner.

## 9. Storage Adapter (Phase 0)

- Interface `StorageAdapter { put(key, body, contentType): {key, url}; url(key); delete(key) }`.
- R2 implementation (S3-compatible SDK). Abstracted so a later swap (e.g. Cloudinary) touches one module. Handles images + audio only; video lives on YouTube and is referenced by ID (no upload path needed).
- Upload endpoints used by the editor are Phase 2; Phase 0 ships the adapter + a seed/utility path so themes/demo media can be referenced.

## 10. Out of Scope (this spec)

- Form-based editor + live preview (Phase 2)
- Custom generic fields write path / `field_overrides` authoring (Phase 2)
- Guest list management UI + RSVP submission + live guestbook data (Phase 3)
- Additional themes, token override authoring UI, drag-to-reorder, remaining invitation types beyond what's needed to render (Phase 4)
- Billing / self-service signup (future; current model is admin-created orders)
- Real wildcard subdomains (chosen path-based for now)

## 11. Success Criteria (Phase 0 + 1)

1. `drizzle-kit` migrations create all tables in §4.1 against Neon.
2. Seed: one theme, one published invitation with a full set of enabled section instances, demo media, a music track, and at least one guest code.
3. Visiting `/u/:slug` SSR-renders the cover; clicking "Buka Undangan" dismisses it, starts music, and reveals sections in `position` order.
4. `?guest=<code>` personalizes the cover; unknown guest degrades gracefully.
5. A `draft` invitation returns 404 to a non-owner and renders for the owner.
6. Theme tokens (+ any seeded `token_overrides`) appear as CSS vars on the root and visibly drive colors/fonts.
7. Auth: signup/login/logout work; `/admin` is gated by session.
8. Adding a new section type in the registry + component makes it renderable with **zero** changes to renderer control flow.

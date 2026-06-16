# Lovree v3 — Design Spec: Package D — SEO Editor + Stored Override

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Public page (`app/pages/u/[slug].vue`, which has a WIP wedding-only auto-SEO via `useSeoMeta`), `loadInvitationBySlug`/`assembleInvitation` loader, admin per-setting PATCH endpoints (`wa-template.patch.ts` pattern), `MediaUploader`, editor settings panels (`InvitationSettings.vue`). Same branch `feat/phase-2b-media`.
- **Scope:** Every public invitation gets correct share/SEO metadata: a pure resolver derives per-type defaults (title, description, OG image, canonical) from the published content, and the owner can override any field in a new SEO editor panel. (Package D of UPDATE.md; final item.)

## 1. Background & Goal

The public page already sets `useSeoMeta`, but the logic is inlined in `u/[slug].vue` and hardcoded to weddings ("Undangan Pernikahan {coupleName}"). Lovree has five invitation types; for birthday/baby_3mo/metatah that default is wrong, and most owners will not set an override, so the default is what ships. There is also no way for an owner to customize the share preview.

**Goal:** A pure, tested resolver produces type-correct SEO defaults from the published invitation; the owner can override title, description, and OG image per field in the editor. Overrides win when set; empty fields fall back to the auto-derived value. Tags render in SSR HTML so crawlers and chat link-previews see them.

## 2. Decisions carried in from brainstorming

- **Editable fields:** title, description, OG image — all three, each independently overridable. Empty override field → auto-derive that one field.
- **OG image input:** the existing `MediaUploader` (R2 upload, returns `{ mediaId, url }`, absolute URL — required for OG).
- **Auto-derive is per-type** (title + description templates for wedding, wedding_metatah, metatah, baby_3mo, birthday). Default must be correct for all five, not wedding-only.
- **Storage:** a new `seo` jsonb column on `invitations` (override values). It lives on the invitation row, so it is **live** — it takes effect without re-publishing (model: "public = published content + live settings", same as slug/music). Migration 0008; dev DB disposable, no backward-compat.
- **Resolution is a pure function** (`resolveSeo`) — pure-core/thin-shell. The page is a thin shell that calls it and passes the result to `useSeoMeta`.
- **Cache:** the public ETag/`s-maxage` is keyed on `publishedAt`; a SEO-only edit will not bust the 60s cache window. Accepted — crawlers re-scrape; instant preview is out of scope.

## 3. Storage (`server/db/schema.ts` + migration 0008)

Add to the `invitations` table:

```ts
seo: jsonb('seo').notNull().default({ title: '', description: '', ogImage: { mediaId: '', url: '' } }),
```

- Shape: `{ title: string; description: string; ogImage: { mediaId: string; url: string } }`. All empty by default → fully auto-derived.
- Generate the migration with the project's drizzle-kit script (`npm run db:generate` or the existing generate command) → `server/db/migrations/0008_*.sql`. Apply with the project's migrate/reset script (the human runs `db:migrate`/`db:reset` — subagents/agents do not run it).

## 4. Pure resolver (`server/seo/resolve.ts`, new)

```ts
export interface SeoOverride { title: string; description: string; ogImage: { mediaId: string; url: string } }
export interface ResolvedSeo { title: string; description: string; ogImage: string; canonical: string }

export function resolveSeo(input: {
  type: string
  slug: string
  seo: SeoOverride
  sections: { type: string; content: any }[]
  siteUrl: string
}): ResolvedSeo
```

Behaviour:
- **Per-field override wins.** For each of title / description / ogImage: if the override field is non-empty, use it; else auto-derive.
- **coupleName / date / venue** pulled from the assembled sections: hero `content.coupleName` (fallback `''`), hero `content.date`, first event `content.venue`.
- **Per-type title template** (using coupleName; trim trailing space when coupleName empty):
  - `wedding`, `wedding_metatah` → `Undangan Pernikahan {coupleName}`
  - `metatah` → `Undangan Metatah {coupleName}`
  - `baby_3mo` → `Undangan Tiga Bulanan {coupleName}`
  - `birthday` → `Undangan Ulang Tahun {coupleName}`
  - unknown type → `Undangan {coupleName}`
- **Per-type description template** — lead clause by type, then append date + venue when present:
  - wedding/wedding_metatah → `Kami mengundang Anda ke pernikahan {coupleName}.`
  - metatah → `Kami mengundang Anda ke upacara Metatah {coupleName}.`
  - baby_3mo → `Kami mengundang Anda ke upacara tiga bulanan {coupleName}.`
  - birthday → `Kami mengundang Anda ke perayaan ulang tahun {coupleName}.`
  - then ` Tanggal: {formatted date}.` if hero date present (format day-month-year id-ID), ` Lokasi: {venue}.` if venue present.
  - empty coupleName → drop the name gracefully (e.g. "…ke pernikahan kami." style fallback per type).
- **ogImage** (always absolute): override `ogImage.url` if non-empty → else first gallery section `content.items[0].url` if present → else `{siteUrl}/og-default.jpg`.
- **canonical** → `{siteUrl}/u/{slug}`.
- Reuse `app/utils/date-format.ts` `formatDate` if convenient, or `Intl` id-ID; date-only ISO is the stored format.

This module is the testable core of Package D. It has no Nuxt/Vue/DB dependency — plain function over plain data.

## 5. Public page (`app/pages/u/[slug].vue`) — thin shell

- Remove the inlined SEO derivation (and the dead `inv?.title` branch — there is no `title` column).
- Call `resolveSeo({ type: inv.type, slug, seo: inv.seo, sections: inv.sections, siteUrl })` where `siteUrl = useRequestURL().origin`.
- Feed the result into `useSeoMeta` (title, ogTitle, description, ogDescription, ogUrl=canonical, ogImage, ogType, ogSiteName 'Lovree', twitterCard 'summary_large_image', twitterTitle/Description/Image) and `useHead({ link: [{ rel: 'canonical', href: canonical }] })`.
- Runs in SSR setup (the existing top-level `await useFetch` makes the data available during SSR) → meta tags are in the server-rendered HTML. **Verify in implementation:** the OG/twitter tags appear in `view-source` / the SSR response, not only after hydration.

## 6. Surface `seo` through the layers

- **`server/utils/invitation.ts`:** add `seo` to `AssembledInvitation` and set it in `assembleInvitation` (`seo: inv.seo ?? { title:'', description:'', ogImage:{ mediaId:'', url:'' } }`). The public `/api/invitations/[slug]` already spreads the assembled object, so `seo` flows to the page.
- **Admin detail GET (`server/api/admin/invitations/[id]/index.get.ts`):** add `seo: inv!.seo` to the returned object so the editor panel loads current override values.

## 7. Editor — panel + PATCH endpoint

- **`server/api/admin/invitations/[id]/seo.patch.ts`** (new), mirroring `wa-template.patch.ts`:
  - Body: `z.object({ title: z.string(), description: z.string(), ogImage: z.object({ mediaId: z.string(), url: z.string() }) })`.
  - Owner-guarded via `assertOwnerOr404`; on success `db.update(invitations).set({ seo: parsed.data, updatedAt: new Date() })`; return `{ ok: true, seo }`.
- **`app/components/editor/SeoSettings.vue`** (new), styled like `InvitationSettings.vue`:
  - Props: current `seo` value + an `onSave(seo)` callback (the editor page wires it to the PATCH, consistent with how `onSetMusic` is passed).
  - Fields: title `UInput`, description `UTextarea`, OG image via `MediaUploader` (binds `{ mediaId, url }`). Helper text noting empty = auto from content.
  - Save on change/blur (debounced or explicit save button — match the existing settings-panel UX; explicit is fine).
- **Editor page (`app/pages/admin/invitations/[id]/...`):** mount `SeoSettings` alongside `InvitationSettings`, pass `seo` from the detail GET and a save handler calling `seo.patch`.

## 8. Testing

- **`resolveSeo` (pure unit, the core):**
  - Override wins for each field when set; auto-derive when empty; per-field independence (override title only → auto description/ogImage).
  - Per-type title + description for all five types (wedding, wedding_metatah, metatah, baby_3mo, birthday) + unknown-type fallback.
  - coupleName empty → graceful title/description (no dangling space / "kami" fallback).
  - ogImage fallback chain: override url → gallery first item → `{siteUrl}/og-default.jpg`; result always absolute.
  - canonical = `{siteUrl}/u/{slug}`.
- **Surfacing:** `assembleInvitation` includes `seo` (and defaults it when the row's `seo` is null/empty).
- **`SeoSettings.vue` component:** renders title/description inputs + MediaUploader; emits/calls save with the edited `seo` object.
- **`seo.patch.ts`:** thin shell — covered by typecheck + suite (endpoints not unit-tested per the project convention).
- Full suite green; typecheck clean. (SSR tag presence verified manually in `view-source`, not in the unit suite.)

## 9. Out of Scope

- Instant cache invalidation on SEO edit (ETag stays keyed on `publishedAt`).
- Robots/sitemap, structured data (JSON-LD), per-guest SEO, multiple OG images.
- Editing SEO for unpublished/draft previews beyond what the existing page already shows.
- Shipping the `og-default.jpg` asset. It does **not** currently exist in `public/`. The resolver still returns `{siteUrl}/og-default.jpg` as the last-resort fallback (used only when there is no override AND no gallery image); tests assert that string path, not the file. Providing the actual image is a separate non-code deliverable for the user/designer and does not block this package.

## 10. Success Criteria

1. A new `seo` jsonb column stores per-field title/description/ogImage overrides on the invitation (live, no re-publish needed).
2. `resolveSeo` is a pure, unit-tested function producing type-correct defaults for all five types, with per-field override precedence and an absolute OG image.
3. The public page renders the resolved tags in SSR HTML (crawler/link-preview visible).
4. The owner edits title, description, and OG image (via MediaUploader) in a SEO editor panel; empty fields auto-derive.
5. Full suite + typecheck green.

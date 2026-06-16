# Package D — SEO Editor + Stored Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure `resolveSeo` function produces type-correct SEO defaults (title, description, OG image, canonical) from the published invitation, an owner overrides any field in a new SEO editor panel, and the public page renders the resolved tags in SSR HTML.

**Architecture:** Pure-core/thin-shell. `resolveSeo` (no Nuxt/DB deps) resolves per-field override-else-auto-derive with per-type templates. A new `seo` jsonb column on `invitations` stores overrides (live, no re-publish). The column is surfaced through `assembleInvitation` → public API → page, and through the admin detail GET → editor panel; a `seo.patch.ts` endpoint saves it.

**Tech Stack:** Nuxt 4, Vue 3, Drizzle (neon-http) + drizzle-kit migrations, Zod, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-16-package-d-seo-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**IMPORTANT — migrations:** The agent edits `schema.ts` and runs `npm run db:generate` to create the migration SQL, but does **NOT** run `db:migrate`/`db:reset` (the human applies migrations to the Neon dev DB). Tests in this plan do not hit the DB.

---

## File Structure

- `server/seo/resolve.ts` (create) — pure `resolveSeo(...)`. The testable core.
- `server/db/schema.ts` (modify) — add `seo` jsonb column to `invitations`.
- `server/db/migrations/0008_*.sql` (generated) — via `db:generate`.
- `server/utils/invitation.ts` (modify) — add `seo` to `AssembledInvitation` + `assembleInvitation`.
- `server/api/admin/invitations/[id]/index.get.ts` (modify) — return `seo`.
- `server/api/admin/invitations/[id]/seo.patch.ts` (create) — save override.
- `app/components/editor/SeoSettings.vue` (create) — editor panel (title/description/OG image).
- `app/pages/admin/invitations/[id]/edit.vue` (modify) — mount `SeoSettings` + save handler.
- `app/pages/u/[slug].vue` (modify) — thin shell calling `resolveSeo`.
- Tests: `tests/seo/resolve.test.ts` (create), `tests/utils/assemble-seo.test.ts` (create), `tests/components/seo-settings.test.ts` (create).

---

### Task 1: Pure `resolveSeo` (the core)

**Files:**
- Create: `server/seo/resolve.ts`
- Test: `tests/seo/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/seo/resolve.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveSeo } from '../../server/seo/resolve'

const base = {
  slug: 'budi-ani',
  siteUrl: 'https://lovree.test',
  seo: { title: '', description: '', ogImage: { mediaId: '', url: '' } },
  sections: [
    { type: 'hero', content: { coupleName: 'Budi & Ani', date: '2026-09-01' } },
    { type: 'event', content: { events: [{ venue: 'Bali' }] } },
    { type: 'gallery', content: { items: [{ mediaId: 'm', url: 'https://cdn/x.jpg' }] } },
  ],
}

describe('resolveSeo', () => {
  it('auto-derives a wedding title/description from content', () => {
    const r = resolveSeo({ type: 'wedding', ...base })
    expect(r.title).toBe('Undangan Pernikahan Budi & Ani')
    expect(r.description).toContain('pernikahan Budi & Ani')
    expect(r.description).toContain('Bali')
    expect(r.canonical).toBe('https://lovree.test/u/budi-ani')
  })

  it('uses per-type templates', () => {
    expect(resolveSeo({ type: 'metatah', ...base }).title).toBe('Undangan Metatah Budi & Ani')
    expect(resolveSeo({ type: 'baby_3mo', ...base }).title).toBe('Undangan Tiga Bulanan Budi & Ani')
    expect(resolveSeo({ type: 'birthday', ...base }).title).toBe('Undangan Ulang Tahun Budi & Ani')
    expect(resolveSeo({ type: 'wedding_metatah', ...base }).title).toBe('Undangan Pernikahan Budi & Ani')
    expect(resolveSeo({ type: 'nope', ...base }).title).toBe('Undangan Budi & Ani')
  })

  it('per-field override wins, other fields still auto-derive', () => {
    const r = resolveSeo({ type: 'wedding', ...base, seo: { title: 'Custom Judul', description: '', ogImage: { mediaId: '', url: '' } } })
    expect(r.title).toBe('Custom Judul')
    expect(r.description).toContain('pernikahan Budi & Ani') // still auto
  })

  it('ogImage fallback chain: override > gallery first > og-default', () => {
    expect(resolveSeo({ type: 'wedding', ...base, seo: { title: '', description: '', ogImage: { mediaId: 'x', url: 'https://cdn/override.jpg' } } }).ogImage).toBe('https://cdn/override.jpg')
    expect(resolveSeo({ type: 'wedding', ...base }).ogImage).toBe('https://cdn/x.jpg')
    const noGallery = { ...base, sections: base.sections.filter((s) => s.type !== 'gallery') }
    expect(resolveSeo({ type: 'wedding', ...noGallery }).ogImage).toBe('https://lovree.test/og-default.jpg')
  })

  it('handles an empty couple name gracefully (no dangling space)', () => {
    const empty = { ...base, sections: [{ type: 'hero', content: { coupleName: '', date: '' } }] }
    const r = resolveSeo({ type: 'wedding', ...empty })
    expect(r.title).toBe('Undangan Pernikahan')
    expect(r.title).not.toMatch(/\s$/)
    expect(r.description).toContain('pernikahan kami')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/seo/resolve.test.ts`
Expected: FAIL — cannot find module `resolve.ts`.

- [ ] **Step 3: Implement `resolveSeo`**

Create `server/seo/resolve.ts` (dependency-free — inline date formatting to avoid a server→app cross-boundary import):

```ts
export interface SeoOverride { title: string; description: string; ogImage: { mediaId: string; url: string } }
export interface ResolvedSeo { title: string; description: string; ogImage: string; canonical: string }

interface SeoInput {
  type: string
  slug: string
  seo: SeoOverride
  sections: { type: string; content: any }[]
  siteUrl: string
}

const TITLE_PREFIX: Record<string, string> = {
  wedding: 'Undangan Pernikahan',
  wedding_metatah: 'Undangan Pernikahan',
  metatah: 'Undangan Metatah',
  baby_3mo: 'Undangan Tiga Bulanan',
  birthday: 'Undangan Ulang Tahun',
}

// Lead clause per type: [withName, withoutName]
const DESC_LEAD: Record<string, [string, string]> = {
  wedding: ['Kami mengundang Anda ke pernikahan {n}.', 'Kami mengundang Anda ke pernikahan kami.'],
  wedding_metatah: ['Kami mengundang Anda ke pernikahan {n}.', 'Kami mengundang Anda ke pernikahan kami.'],
  metatah: ['Kami mengundang Anda ke upacara Metatah {n}.', 'Kami mengundang Anda ke upacara Metatah kami.'],
  baby_3mo: ['Kami mengundang Anda ke upacara tiga bulanan {n}.', 'Kami mengundang Anda ke upacara tiga bulanan kami.'],
  birthday: ['Kami mengundang Anda ke perayaan ulang tahun {n}.', 'Kami mengundang Anda ke perayaan ulang tahun kami.'],
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// Format a date-only ISO ('YYYY-MM-DD') as 'DD MMMM YYYY' (id-ID). Non-date input → '' (skipped).
function formatIdDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return ''
  const [, y, mo, d] = m
  const month = MONTHS[Number(mo) - 1]
  if (!month) return ''
  return `${d} ${month} ${y}`
}

function sectionContent(sections: SeoInput['sections'], type: string) {
  return sections.find((s) => s.type === type)?.content
}

export function resolveSeo(input: SeoInput): ResolvedSeo {
  const { type, slug, seo, sections, siteUrl } = input
  const hero = sectionContent(sections, 'hero') ?? {}
  const coupleName: string = (hero.coupleName ?? '').trim()
  const heroDate: string = hero.date ?? ''
  const venue: string = sectionContent(sections, 'event')?.events?.[0]?.venue ?? ''

  // Title
  const prefix = TITLE_PREFIX[type] ?? 'Undangan'
  const autoTitle = coupleName ? `${prefix} ${coupleName}` : prefix
  const title = seo.title?.trim() ? seo.title : autoTitle

  // Description
  const lead = DESC_LEAD[type] ?? ['Kami mengundang Anda ke acara {n}.', 'Kami mengundang Anda ke acara kami.']
  let autoDesc = coupleName ? lead[0].replace('{n}', coupleName) : lead[1]
  const dateStr = formatIdDate(heroDate)
  if (dateStr) autoDesc += ` Tanggal: ${dateStr}.`
  if (venue) autoDesc += ` Lokasi: ${venue}.`
  const description = seo.description?.trim() ? seo.description : autoDesc

  // OG image — always absolute
  const galleryUrl = sectionContent(sections, 'gallery')?.items?.[0]?.url ?? ''
  const ogImage = seo.ogImage?.url?.trim() ? seo.ogImage.url : (galleryUrl || `${siteUrl}/og-default.jpg`)

  return { title, description, ogImage, canonical: `${siteUrl}/u/${slug}` }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/seo/resolve.test.ts`
Expected: PASS (6 tests). `formatIdDate('2026-09-01')` produces `'01 September 2026'`; the description tests only check `toContain('Bali')` / `toContain('pernikahan Budi & Ani')`, so exact date wording is not asserted.

- [ ] **Step 5: Commit**

```bash
git add server/seo/resolve.ts tests/seo/resolve.test.ts
git commit -m "feat: pure resolveSeo (per-type defaults, per-field override, og fallback)"
```

---

### Task 2: `seo` column + surface through the loader

**Files:**
- Modify: `server/db/schema.ts` (invitations table)
- Modify: `server/utils/invitation.ts` (`AssembledInvitation` + `assembleInvitation`)
- Generated: `server/db/migrations/0008_*.sql`
- Test: `tests/utils/assemble-seo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/assemble-seo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assembleInvitation } from '../../server/utils/invitation'

const theme = { tokens: {}, key: 'base' }

describe('assembleInvitation surfaces seo', () => {
  it('passes the stored seo override through', () => {
    const seo = { title: 'X', description: 'Y', ogImage: { mediaId: 'm', url: 'https://cdn/o.jpg' } }
    const out = assembleInvitation({ id: 'i', slug: 's', type: 'wedding', status: 'published', tokenOverrides: {}, seo }, theme, [])
    expect(out.seo).toEqual(seo)
  })
  it('defaults seo when the row has none', () => {
    const out = assembleInvitation({ id: 'i', slug: 's', type: 'wedding', status: 'published', tokenOverrides: {} }, theme, [])
    expect(out.seo).toEqual({ title: '', description: '', ogImage: { mediaId: '', url: '' } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/assemble-seo.test.ts`
Expected: FAIL — `out.seo` is undefined.

- [ ] **Step 3: Add the schema column**

In `server/db/schema.ts`, inside `export const invitations = pgTable('invitations', { ... })`, add after `tokenOverrides`:

```ts
  seo: jsonb('seo').notNull().default({ title: '', description: '', ogImage: { mediaId: '', url: '' } }),
```

- [ ] **Step 4: Surface seo in the loader**

In `server/utils/invitation.ts`:

Add to the `AssembledInvitation` interface:

```ts
  seo: { title: string; description: string; ogImage: { mediaId: string; url: string } }
```

In `assembleInvitation`, add `seo` to the returned object:

```ts
  return {
    id: inv.id, slug: inv.slug, type: inv.type, status: inv.status, ownerId: inv.ownerId,
    cssVars, sections: ordered, themeKey: theme?.key ?? 'base',
    seo: inv.seo ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } },
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/utils/assemble-seo.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Generate the migration**

Run: `npm run db:generate`
Expected: a new `server/db/migrations/0008_*.sql` adding the `seo` column. (Do NOT run `db:migrate` — the human applies it.)

- [ ] **Step 7: Commit**

```bash
git add server/db/schema.ts server/utils/invitation.ts server/db/migrations tests/utils/assemble-seo.test.ts
git commit -m "feat: seo column on invitations, surfaced via assembleInvitation"
```

---

### Task 3: Admin detail GET returns `seo` + `seo.patch.ts` endpoint

**Files:**
- Modify: `server/api/admin/invitations/[id]/index.get.ts`
- Create: `server/api/admin/invitations/[id]/seo.patch.ts`

(No unit test — endpoints are thin shells, verified by typecheck + the full suite, per project convention.)

- [ ] **Step 1: Return `seo` from the detail GET**

In `server/api/admin/invitations/[id]/index.get.ts`, add `seo` to the returned object (after `waTemplate`):

```ts
    waTemplate: inv!.waTemplate,
    seo: (inv!.seo as any) ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } },
    themeKey: (theme as any)?.key ?? 'base',
```

- [ ] **Step 2: Create the PATCH endpoint**

Create `server/api/admin/invitations/[id]/seo.patch.ts`:

```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'

const body = z.object({
  title: z.string(),
  description: z.string(),
  ogImage: z.object({ mediaId: z.string(), url: z.string() }),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()
  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })

  await db.update(invitations).set({ seo: parsed.data, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, seo: parsed.data }
})
```

- [ ] **Step 3: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add server/api/admin/invitations/[id]/index.get.ts server/api/admin/invitations/[id]/seo.patch.ts
git commit -m "feat: seo.patch endpoint + return seo from admin detail GET"
```

---

### Task 4: `SeoSettings.vue` editor panel

**Files:**
- Create: `app/components/editor/SeoSettings.vue`
- Test: `tests/components/seo-settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/seo-settings.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SeoSettings from '../../app/components/editor/SeoSettings.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const MediaUploader = { name: 'MediaUploader', props: ['kind'], emits: ['uploaded'], template: '<button class="mu" @click="$emit(\'uploaded\', { id: \'m9\', url: \'https://cdn/up.jpg\' })">up</button>' }
const stubs = { ...nuxtUiStubs, MediaUploader }

const seo = { title: 'Judul', description: 'Deskripsi', ogImage: { mediaId: '', url: '' } }

describe('SeoSettings', () => {
  it('renders current title + description', () => {
    const w = mount(SeoSettings, { props: { seo, onSave: vi.fn() }, global: { stubs } })
    expect(w.html()).toContain('Judul')
    expect(w.html()).toContain('Deskripsi')
  })

  it('saves the og image url when MediaUploader emits uploaded', async () => {
    const onSave = vi.fn()
    const w = mount(SeoSettings, { props: { seo, onSave }, global: { stubs } })
    await w.find('button.mu').trigger('click')
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ ogImage: { mediaId: 'm9', url: 'https://cdn/up.jpg' } }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/seo-settings.test.ts`
Expected: FAIL — cannot find module `SeoSettings.vue`.

- [ ] **Step 3: Implement the panel**

Create `app/components/editor/SeoSettings.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MediaUploader from './MediaUploader.vue'

interface Seo { title: string; description: string; ogImage: { mediaId: string; url: string } }
const props = defineProps<{ seo: Seo; onSave: (seo: Seo) => Promise<void> | void }>()

const title = ref(props.seo.title ?? '')
const description = ref(props.seo.description ?? '')
const ogImage = ref<{ mediaId: string; url: string }>({ ...(props.seo.ogImage ?? { mediaId: '', url: '' }) })

function current(): Seo {
  return { title: title.value, description: description.value, ogImage: ogImage.value }
}
async function save() {
  await props.onSave(current())
}
function onUploaded(p: { id: string; url: string }) {
  ogImage.value = { mediaId: p.id, url: p.url }
  save()
}
function clearOgImage() {
  ogImage.value = { mediaId: '', url: '' }
  save()
}
</script>

<template>
  <div class="rounded border border-default bg-default p-3 text-sm">
    <h3 class="mb-2 font-medium text-highlighted">SEO &amp; Share</h3>
    <p class="mb-2 text-xs text-muted">Kosongkan untuk memakai default otomatis dari konten undangan.</p>

    <UFormField label="Judul (title)">
      <UInput v-model="title" class="w-full" placeholder="Otomatis dari konten" @blur="save" />
    </UFormField>

    <UFormField label="Deskripsi" class="mt-2">
      <UTextarea v-model="description" class="w-full" placeholder="Otomatis dari konten" @blur="save" />
    </UFormField>

    <span class="mt-3 mb-1 block text-muted">Gambar share (OG image)</span>
    <img v-if="ogImage.url" :src="ogImage.url" alt="" class="mb-2 h-24 w-auto rounded object-cover" />
    <div class="flex items-center gap-2">
      <MediaUploader kind="image" @uploaded="onUploaded" />
      <UButton v-if="ogImage.url" variant="ghost" color="neutral" label="Hapus" @click="clearOgImage" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/seo-settings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/editor/SeoSettings.vue tests/components/seo-settings.test.ts
git commit -m "feat: SeoSettings editor panel (title/description/OG image)"
```

---

### Task 5: Wire the panel into the editor + make the public page a thin shell

**Files:**
- Modify: `app/pages/admin/invitations/[id]/edit.vue`
- Modify: `app/pages/u/[slug].vue`

(No new unit test — the editor wiring is integration glue verified by typecheck + suite; `resolveSeo` is already tested in Task 1.)

- [ ] **Step 1: Add the seo ref + save handler in `edit.vue`**

In the `<script setup>` of `app/pages/admin/invitations/[id]/edit.vue`, near the other settings refs (after the `setMusic` block around line 58), add:

```ts
import SeoSettings from '~/components/editor/SeoSettings.vue'

const seo = ref((data.value as any).seo ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } })
async function saveSeo(next: { title: string; description: string; ogImage: { mediaId: string; url: string } }) {
  seo.value = next
  try { await $fetch(`/api/admin/invitations/${id}/seo`, { method: 'PATCH', body: next }) } catch { /* non-fatal */ }
}
```

(Place the `import` with the other component imports at the top.)

- [ ] **Step 2: Mount the panel in the "tampilan" tab**

In the template, inside `<template #tampilan>`, after the `<InvitationSettings ... />` line (around line 111), add:

```vue
                <SeoSettings :seo="seo" :on-save="saveSeo" />
```

- [ ] **Step 3: Rewrite `u/[slug].vue` as a thin shell**

Replace the `<script setup>` of `app/pages/u/[slug].vue` with:

```vue
<script setup lang="ts">
import InvitationRoot from '~/components/invitation/InvitationRoot.vue'
import { resolveSeo } from '~~/server/seo/resolve'

const route = useRoute()
const slug = route.params.slug as string
const rawGuest = route.query.guest
const guestCode = (Array.isArray(rawGuest) ? rawGuest[0] : rawGuest) as string | undefined

const { data, error } = await useFetch(`/api/invitations/${slug}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan' })

const inv = data.value as any
const siteUrl = useRequestURL().origin
const seo = resolveSeo({
  type: inv?.type ?? 'wedding',
  slug,
  seo: inv?.seo ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } },
  sections: inv?.sections ?? [],
  siteUrl,
})

useSeoMeta({
  title: seo.title,
  ogTitle: seo.title,
  description: seo.description,
  ogDescription: seo.description,
  ogUrl: seo.canonical,
  ogImage: seo.ogImage,
  ogType: 'website',
  ogSiteName: 'Lovree',
  twitterCard: 'summary_large_image',
  twitterTitle: seo.title,
  twitterDescription: seo.description,
  twitterImage: seo.ogImage,
})
useHead({ link: [{ rel: 'canonical', href: seo.canonical }] })
</script>

<template>
  <InvitationRoot v-if="data" :data="data as any" :guest-name="(data as any)?.guestName ?? 'Tamu Undangan'" :guest-code="guestCode ?? ''" />
</template>
```

- [ ] **Step 4: Typecheck + full suite**

Run: `npx nuxt typecheck`
Expected: exit 0.
Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/invitations/[id]/edit.vue app/pages/u/[slug].vue
git commit -m "feat: wire SeoSettings into editor; public page uses resolveSeo (thin shell)"
```

---

### Task 6: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all tests pass (prior 241 + resolveSeo 6 + assemble-seo 2 + seo-settings 2).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Manual SSR check (report, do not block the suite)**

Note for the human: after applying the migration (`npm run db:migrate` or `db:reset`) and running the dev server, confirm via `view-source` of a published `/u/<slug>` that `<title>`, `og:title`, `og:description`, `og:image`, and `<link rel="canonical">` are present in the server-rendered HTML (not only after hydration). Crawlers do not run JS.

- [ ] **Step 4: Report**

Confirm Package D complete: `seo` column (live override), pure per-type `resolveSeo`, SEO editor panel (title/description/OG image via MediaUploader), public page renders resolved tags in SSR. Then hand back for the finish-branch decision (all UPDATE.md packages A–E done).

---

## Self-Review Notes

- **Spec coverage:** §3 storage → Task 2; §4 resolver → Task 1; §5 public page → Task 5; §6 surfacing → Task 2 (loader) + Task 3 (admin GET); §7 editor → Tasks 3 (endpoint) + 4 (panel) + 5 (wiring); §8 testing → Tasks 1/2/4 + Task 6 gate. All covered.
- **Type consistency:** `SeoOverride`/`Seo` shape `{ title, description, ogImage: { mediaId, url } }` is identical across `resolve.ts` (Task 1), schema default (Task 2), `assembleInvitation` (Task 2), `seo.patch` body (Task 3), `SeoSettings` prop (Task 4), and both pages (Task 5). `resolveSeo` input keys (`type, slug, seo, sections, siteUrl`) match the page call in Task 5.
- **Migration discipline:** agent runs `db:generate` only (Task 2 Step 6); never `db:migrate`/`db:reset`. Tests avoid the DB (pure resolver + pure-ish `assembleInvitation` over plain objects).
- **og-default.jpg:** referenced by `resolveSeo` as the last-resort string; the asset itself is out of scope (does not exist yet) — tests assert the string, not the file.
- **Cross-boundary import:** `u/[slug].vue` imports `resolveSeo` from `~~/server/seo/resolve` (established app→server rootDir-alias pattern). `resolve.ts` is dependency-free (inline `formatIdDate`, no server→app import) so it builds cleanly under Nitro and is trivially unit-testable.

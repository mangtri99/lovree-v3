# Music Library (per-user) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-invitation audio upload with a per-user music library: a sidebar "Musik" page (upload/rename/delete tracks) and an editor dropdown to pick a library track; one track is reusable across invitations.

**Architecture:** A new owner-scoped `music_tracks` table decouples music from the `media` table; `invitations` references a track by id (`musicTrackId`, replacing `musicMediaId`). Library CRUD endpoints + a Musik page manage tracks; the invitation `PATCH /music` switches to a track id; the editor GET, public loader, and `InvitationSettings` resolve/select by track.

**Tech Stack:** Nuxt 4 (Nitro), Drizzle ORM + Neon Postgres, Zod, `@aws-sdk/client-s3` (R2), nanoid, Vitest, Nuxt UI v4.

**Branch:** `feat/phase-2b-media`. Migration `0005`. Dev DB disposable (drop `musicMediaId`, no data migration).

**Grounding facts:**
- `media` table: `invitationId` NOT NULL — stays image/per-invitation, untouched.
- `invitations.musicMediaId` (schema line 28) → being replaced by `musicTrackId`. `users` table at schema line 3; `invitations` at line 20; `media` at line 66.
- `server/api/admin/media.post.ts` is the R2-upload reference: 6MB content-length pre-cap → `readMultipartFormData` → `validateMediaUpload({ kind, size, bytes })` (magic-byte sniff, 5MB audio cap, returns `{ ext, contentType }`) → `createR2Adapter(cfg).put(key, bytes, contentType)` → returns `{ url }`. `useRuntimeConfig().r2` holds the R2 config. The R2 adapter also has `delete(key)`.
- `assertOwnerOr404` (server/utils/ownership.ts) → 404. `server/utils/belongs.ts` has `rowBelongsToInvitation`.
- `PATCH /api/admin/invitations/[id]/music.patch.ts` currently validates `musicMediaId` via `mediaBelongsToInvitation`.
- Editor GET (`…/[id]/index.get.ts`) resolves `musicMediaId → media.url`, returns `musicMediaId` + `musicUrl`.
- `loadInvitationBySlug` (server/utils/invitation.ts) resolves `inv.musicMediaId → media.url`.
- `edit.vue`: `musicUrl` ref (line 45), `setMusic(mediaId)` (line 46) PATCHes `{ musicMediaId }`, `<InvitationSettings v-model:music-url="musicUrl" :on-set-music="setMusic" />` (line 86), passes `:music-url` to EditorPreview.
- `InvitationSettings.vue` currently uploads audio via `MediaUploader kind="audio"`.

---

## File Structure

- Modify `server/db/schema.ts` — `musicTracks` table; `invitations.musicMediaId` → `musicTrackId`; generate `0005`.
- Modify `server/utils/belongs.ts` — add `rowBelongsToOwner`.
- Create `server/api/admin/music/index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`.
- Modify `server/api/admin/invitations/[id]/music.patch.ts` — switch to `musicTrackId`.
- Modify `server/api/admin/invitations/[id]/index.get.ts` + `server/utils/invitation.ts` — resolve `musicTrackId`.
- Modify `app/components/editor/InvitationSettings.vue` — track dropdown.
- Modify `app/pages/admin/invitations/[id]/edit.vue` — load tracks, wire `musicTrackId`.
- Create `app/pages/admin/music.vue` + modify `app/layouts/admin.vue` — Musik page + nav.
- Tests: `tests/utils/belongs.test.ts` (add), `tests/components/invitation-settings.test.ts` (rewrite).

---

## Task 1: Schema — `music_tracks` + `invitations.musicTrackId` (migration 0005)

**Files:**
- Modify: `server/db/schema.ts`
- Generated: `server/db/migrations/0005_*.sql`

- [ ] **Step 1: Add the `music_tracks` table**

In `server/db/schema.ts`, define `musicTracks` **after the `users` table and before `invitations`** (so the FK resolves):
```ts
export const musicTracks = pgTable('music_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 2: Swap the invitation column**

In the `invitations` table, replace:
```ts
  musicMediaId: uuid('music_media_id'),
```
with:
```ts
  musicTrackId: uuid('music_track_id').references(() => musicTracks.id),
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: `server/db/migrations/0005_*.sql` (CREATE TABLE music_tracks; ALTER invitations DROP music_media_id, ADD music_track_id + FK). Confirm: `ls server/db/migrations/0005_*.sql`.
Do NOT run `db:migrate`.

- [ ] **Step 4: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep "error TS" /tmp/tc.log`
Expected: errors ONLY in files that still reference `musicMediaId` (music.patch.ts, index.get.ts, invitation.ts) — these are fixed in Tasks 4-5. Note them; confirm no OTHER unexpected error. (The schema itself must compile.)

- [ ] **Step 5: Commit**

```bash
git add server/db/schema.ts server/db/migrations/
git commit -m "feat: music_tracks table + invitations.musicTrackId (migration 0005)"
```

---

## Task 2: `rowBelongsToOwner` predicate

**Files:**
- Modify: `server/utils/belongs.ts`
- Test: `tests/utils/belongs.test.ts` (add cases)

- [ ] **Step 1: Add the failing test**

Append to `tests/utils/belongs.test.ts`:
```ts
import { rowBelongsToOwner } from '../../server/utils/belongs'

describe('rowBelongsToOwner', () => {
  it('true when the row is owned by the user', () => {
    expect(rowBelongsToOwner({ ownerId: 'u1' }, 'u1')).toBe(true)
  })
  it('false for another owner', () => {
    expect(rowBelongsToOwner({ ownerId: 'u2' }, 'u1')).toBe(false)
  })
  it('false for a missing row', () => {
    expect(rowBelongsToOwner(null, 'u1')).toBe(false)
  })
})
```
(If `tests/utils/belongs.test.ts` already imports from `'../../server/utils/belongs'`, add `rowBelongsToOwner` to that existing import instead of a second import line.)

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/utils/belongs.test.ts`
Expected: FAIL — `rowBelongsToOwner` not exported.

- [ ] **Step 3: Implement**

Append to `server/utils/belongs.ts`:
```ts
// True iff the row exists and is owned by the user. Used to reject another user's
// music track from the library/select endpoints.
export function rowBelongsToOwner(row: { ownerId: string } | null, ownerId: string): boolean {
  return !!row && row.ownerId === ownerId
}
```

- [ ] **Step 4: Run, confirm PASS**

Run: `npx vitest run tests/utils/belongs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/belongs.ts tests/utils/belongs.test.ts
git commit -m "feat: rowBelongsToOwner predicate for music-track ownership"
```

---

## Task 3: Music-library CRUD endpoints

**Files:**
- Create: `server/api/admin/music/index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`
- Test: none new (owner-guard via `rowBelongsToOwner`/auth; verified by typecheck + Task 9).

- [ ] **Step 1: GET list**

Create `server/api/admin/music/index.get.ts`:
```ts
import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../db'
import { musicTracks } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()
  const tracks = await db.select({ id: musicTracks.id, name: musicTracks.name, url: musicTracks.url })
    .from(musicTracks).where(eq(musicTracks.ownerId, ownerId)).orderBy(desc(musicTracks.createdAt))
  return { tracks }
})
```

- [ ] **Step 2: POST upload**

Create `server/api/admin/music/index.post.ts`:
```ts
import { nanoid } from 'nanoid'
import { useDb } from '../../../db'
import { musicTracks } from '../../../db/schema'
import { validateMediaUpload } from '../../../utils/media-validate'
import { createR2Adapter } from '../../../storage/r2'

const MAX_BODY_BYTES = 6 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const contentLength = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) throw createError({ statusCode: 413, message: 'Payload too large' })

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, message: 'Expected multipart form data' })
  const get = (name: string) => parts.find((p) => p.name === name)
  const file = get('file')
  const name = get('name')?.data?.toString()?.trim() || file?.filename || 'Tanpa Judul'
  if (!file?.data) throw createError({ statusCode: 400, message: 'Missing file' })

  const result = validateMediaUpload({ kind: 'audio', size: file.data.length, bytes: file.data })
  if (!result.ok) throw createError({ statusCode: 400, message: result.error })

  const cfg = useRuntimeConfig().r2 as any
  const adapter = createR2Adapter({ accountId: cfg.accountId, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, bucket: cfg.bucket, publicUrl: cfg.publicUrl })
  const key = `music/${ownerId}/${nanoid()}.${result.ext}`
  const { url } = await adapter.put(key, file.data, result.contentType)

  const db = useDb()
  const [row] = await db.insert(musicTracks).values({ ownerId, name, r2Key: key, url })
    .returning({ id: musicTracks.id, name: musicTracks.name, url: musicTracks.url })
  return row
})
```
(Match the exact `createR2Adapter` config keys used in `server/api/admin/media.post.ts` — copy that adapter construction verbatim if it differs.)

- [ ] **Step 3: PATCH rename**

Create `server/api/admin/music/[id].patch.ts`:
```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { musicTracks } from '../../../db/schema'
import { rowBelongsToOwner } from '../../../utils/belongs'

const body = z.object({ name: z.string().trim().min(1).max(120) })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const ownerId = session.user?.id ?? null
  const db = useDb()
  const [track] = await db.select({ id: musicTracks.id, ownerId: musicTracks.ownerId }).from(musicTracks).where(eq(musicTracks.id, id)).limit(1)
  if (!rowBelongsToOwner(track ?? null, ownerId ?? '')) throw createError({ statusCode: 404, message: 'Not found' })
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  await db.update(musicTracks).set({ name: parsed.data.name }).where(eq(musicTracks.id, id))
  return { ok: true }
})
```

- [ ] **Step 4: DELETE track**

Create `server/api/admin/music/[id].delete.ts`:
```ts
import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { musicTracks, invitations } from '../../../db/schema'
import { rowBelongsToOwner } from '../../../utils/belongs'
import { createR2Adapter } from '../../../storage/r2'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const ownerId = session.user?.id ?? null
  const db = useDb()
  const [track] = await db.select({ id: musicTracks.id, ownerId: musicTracks.ownerId, r2Key: musicTracks.r2Key }).from(musicTracks).where(eq(musicTracks.id, id)).limit(1)
  if (!rowBelongsToOwner(track ?? null, ownerId ?? '')) throw createError({ statusCode: 404, message: 'Not found' })

  await db.update(invitations).set({ musicTrackId: null }).where(and(eq(invitations.musicTrackId, id), eq(invitations.ownerId, ownerId!)))

  try {
    const cfg = useRuntimeConfig().r2 as any
    const adapter = createR2Adapter({ accountId: cfg.accountId, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, bucket: cfg.bucket, publicUrl: cfg.publicUrl })
    await adapter.delete(track!.r2Key)
  } catch { /* best-effort R2 cleanup */ }

  await db.delete(musicTracks).where(eq(musicTracks.id, id))
  return { ok: true }
})
```

- [ ] **Step 5: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep "error TS" /tmp/tc.log`
Expected: no errors in the new `music/` files (pre-existing musicMediaId errors elsewhere remain until Tasks 4-5).

- [ ] **Step 6: Commit**

```bash
git add "server/api/admin/music"
git commit -m "feat: music library CRUD endpoints (owner-scoped upload/list/rename/delete)"
```

---

## Task 4: Invitation `PATCH /music` → track id

**Files:**
- Modify: `server/api/admin/invitations/[id]/music.patch.ts`

- [ ] **Step 1: Rewrite to use musicTrackId + rowBelongsToOwner**

Replace `server/api/admin/invitations/[id]/music.patch.ts` with:
```ts
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations, musicTracks } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { rowBelongsToOwner } from '../../../../utils/belongs'

const body = z.object({ musicTrackId: z.string().uuid().nullable() })

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()

  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })
  const { musicTrackId } = parsed.data

  if (musicTrackId !== null) {
    const [t] = await db.select({ ownerId: musicTracks.ownerId }).from(musicTracks).where(eq(musicTracks.id, musicTrackId)).limit(1)
    if (!rowBelongsToOwner(t ?? null, session.user?.id ?? '')) throw createError({ statusCode: 400, message: 'Invalid track' })
  }

  await db.update(invitations).set({ musicTrackId, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, musicTrackId }
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep "error TS" /tmp/tc.log`
Expected: no errors in `music.patch.ts` (remaining musicMediaId errors are in index.get.ts + invitation.ts, fixed in Task 5).

- [ ] **Step 3: Commit**

```bash
git add "server/api/admin/invitations/[id]/music.patch.ts"
git commit -m "feat: invitation music PATCH selects a library track (owner-validated)"
```

---

## Task 5: Resolve `musicTrackId → url` (editor GET + public loader)

**Files:**
- Modify: `server/api/admin/invitations/[id]/index.get.ts`
- Modify: `server/utils/invitation.ts`

- [ ] **Step 1: Editor GET**

In `server/api/admin/invitations/[id]/index.get.ts`, change the schema import to include `musicTracks` (and drop `media` if it's now unused there — check), and replace the music resolution block:
```ts
  let musicUrl: string | null = null
  if (inv!.musicTrackId) {
    const [t] = await db.select({ url: musicTracks.url }).from(musicTracks).where(eq(musicTracks.id, inv!.musicTrackId)).limit(1)
    musicUrl = t?.url ?? null
  }
```
and the returned field `musicMediaId: inv!.musicMediaId, musicUrl,` → `musicTrackId: inv!.musicTrackId, musicUrl,`. (Remove the now-unused `and`/`media` imports if they become unused; keep `eq`.)

- [ ] **Step 2: Public loader**

In `server/utils/invitation.ts`, change the import to include `musicTracks` (drop `media` if unused) and replace the music block:
```ts
  let musicUrl: string | null = null
  if (inv.musicTrackId) {
    const trackRows = await db.select({ url: musicTracks.url }).from(musicTracks).where(eq(musicTracks.id, inv.musicTrackId)).limit(1)
    musicUrl = trackRows[0]?.url || null
  }
```
(Keep the returned `{ …, musicUrl, … }` shape; the public response field stays `musicUrl`. Remove the now-unused `and` import if it is no longer referenced.)

- [ ] **Step 3: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, **0 errors** (all `musicMediaId` references now gone).
Run: `npx vitest run` — all pass.

- [ ] **Step 4: Commit**

```bash
git add "server/api/admin/invitations/[id]/index.get.ts" server/utils/invitation.ts
git commit -m "feat: resolve invitation music via musicTrackId in editor GET + public loader"
```

---

## Task 6: InvitationSettings track dropdown + editor wiring

**Files:**
- Modify: `app/components/editor/InvitationSettings.vue` (rewrite)
- Modify: `app/pages/admin/invitations/[id]/edit.vue`
- Test: `tests/components/invitation-settings.test.ts` (rewrite)

- [ ] **Step 1: Write the failing test**

Replace `tests/components/invitation-settings.test.ts` with:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InvitationSettings from '../../app/components/editor/InvitationSettings.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const tracks = [{ id: 't1', name: 'Lagu A', url: 'https://cdn/a.mp3' }, { id: 't2', name: 'Lagu B', url: 'https://cdn/b.mp3' }]
const opts = { global: { stubs: { ...nuxtUiStubs, NuxtLink: { template: '<a><slot/></a>' } } } }

describe('InvitationSettings', () => {
  it('lists the user tracks plus a no-music option', () => {
    const w = mount(InvitationSettings, { props: { tracks, musicTrackId: null, onSetMusic: vi.fn() }, ...opts })
    const text = w.find('select').text()
    expect(text).toContain('Lagu A')
    expect(text).toContain('Lagu B')
    expect(text).toContain('tanpa musik')
  })
  it('calls onSetMusic with the chosen track id and emits its url', async () => {
    const onSetMusic = vi.fn().mockResolvedValue(undefined)
    const w = mount(InvitationSettings, { props: { tracks, musicTrackId: null, onSetMusic }, ...opts })
    await w.find('select').setValue('t1')
    await Promise.resolve()
    expect(onSetMusic).toHaveBeenCalledWith('t1')
    expect(w.emitted('update:musicUrl')!.at(-1)![0]).toBe('https://cdn/a.mp3')
  })
  it('calls onSetMusic with null when picking no-music', async () => {
    const onSetMusic = vi.fn().mockResolvedValue(undefined)
    const w = mount(InvitationSettings, { props: { tracks, musicTrackId: 't1', onSetMusic }, ...opts })
    await w.find('select').setValue('none')
    await Promise.resolve()
    expect(onSetMusic).toHaveBeenCalledWith(null)
    expect(w.emitted('update:musicUrl')!.at(-1)![0]).toBe(null)
  })
})
```
(The `nuxt-ui-stubs` helper stubs `USelect` as a native `<select>` emitting `update:modelValue` from `change`.)

- [ ] **Step 2: Run, confirm FAIL**

Run: `npx vitest run tests/components/invitation-settings.test.ts`
Expected: FAIL — the component still renders an uploader, not a select.

- [ ] **Step 3: Rewrite `InvitationSettings.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
const NONE = 'none'
const props = defineProps<{ tracks: { id: string; name: string; url: string }[]; musicTrackId: string | null; onSetMusic: (id: string | null) => Promise<void> }>()
const emit = defineEmits<{ 'update:musicUrl': [string | null] }>()

const selected = ref<string>(props.musicTrackId ?? NONE)
const items = computed(() => [{ label: '— tanpa musik —', value: NONE }, ...props.tracks.map((t) => ({ label: t.name, value: t.id }))])
const currentUrl = computed(() => props.tracks.find((t) => t.id === selected.value)?.url ?? null)

async function onChange(v: string) {
  selected.value = v
  await props.onSetMusic(v === NONE ? null : v)
  emit('update:musicUrl', currentUrl.value)
}
</script>
<template>
  <div class="rounded border border-default bg-default p-3 text-sm">
    <h3 class="mb-2 font-medium text-highlighted">Pengaturan Undangan</h3>
    <span class="mb-1 block text-muted">Musik</span>
    <USelect :model-value="selected" :items="items" class="w-full" @update:model-value="onChange" />
    <audio v-if="currentUrl" :src="currentUrl" controls class="mt-2 h-8" />
    <NuxtLink to="/admin/music" class="mt-2 block text-xs text-primary">Kelola musik →</NuxtLink>
  </div>
</template>
```

- [ ] **Step 4: Wire the editor**

In `app/pages/admin/invitations/[id]/edit.vue`:
- After the existing `useFetch` for the invitation, add a tracks fetch + reactive trackId:
```ts
const { data: tracksData } = await useFetch<any>('/api/admin/music')
const tracks = computed(() => ((tracksData.value as any)?.tracks ?? []))
const musicTrackId = ref<string | null>((data.value as any).musicTrackId ?? null)
```
(`computed` is already imported in edit.vue.)
- Replace the `setMusic` function:
```ts
async function setMusic(trackId: string | null) {
  musicTrackId.value = trackId
  await $fetch(`/api/admin/invitations/${id}/music`, { method: 'PATCH', body: { musicTrackId: trackId } })
}
```
- Update the `<InvitationSettings … />` usage in the template:
```vue
          <InvitationSettings :tracks="tracks" :music-track-id="musicTrackId" :on-set-music="setMusic" @update:music-url="musicUrl = $event" />
```
(Keep the `musicUrl` ref + its use by `EditorPreview` unchanged.)

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/components/invitation-settings.test.ts` — PASS.
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/InvitationSettings.vue "app/pages/admin/invitations/[id]/edit.vue" tests/components/invitation-settings.test.ts
git commit -m "feat: editor selects a music track from the library (dropdown)"
```

---

## Task 7: Musik sidebar page + nav

**Files:**
- Create: `app/pages/admin/music.vue`
- Modify: `app/layouts/admin.vue`

- [ ] **Step 1: Add the nav item**

In `app/layouts/admin.vue`, add a "Musik" entry to the `links` nav array (after "Undangan"):
```ts
    { label: 'Musik', icon: 'i-lucide-music', to: '/admin/music' },
```
(Match the existing `links` structure — it is an array-of-arrays of `{ label, icon, to }`.)

- [ ] **Step 2: Create the page**

Create `app/pages/admin/music.vue`:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch<any>('/api/admin/music')
const tracks = computed<any[]>(() => (data.value as any)?.tracks ?? [])

const name = ref('')
const uploading = ref(false)
const error = ref('')

async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true; error.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    if (name.value.trim()) form.append('name', name.value.trim())
    await $fetch('/api/admin/music', { method: 'POST', body: form })
    name.value = ''
    ;(e.target as HTMLInputElement).value = ''
    await refresh()
  } catch (err: any) { error.value = err?.data?.message ?? 'Upload gagal' } finally { uploading.value = false }
}
async function rename(t: any) {
  const newName = (prompt('Nama baru:', t.name) ?? '').trim()
  if (!newName || newName === t.name) return
  await $fetch(`/api/admin/music/${t.id}`, { method: 'PATCH', body: { name: newName } })
  await refresh()
}
async function del(id: string) {
  await $fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="music">
    <template #header><UDashboardNavbar title="Musik" /></template>
    <template #body>
      <div class="space-y-6">
        <UCard>
          <h2 class="mb-3 font-medium">Tambah Musik</h2>
          <div class="flex flex-wrap items-end gap-2">
            <UInput v-model="name" placeholder="Nama lagu (opsional)" />
            <input type="file" accept="audio/mpeg" :disabled="uploading" @change="onUpload" />
            <span v-if="uploading" class="text-xs text-muted">Mengunggah…</span>
          </div>
          <p v-if="error" class="mt-2 text-sm text-error">{{ error }}</p>
        </UCard>

        <UCard>
          <h2 class="mb-3 font-medium">Daftar Musik ({{ tracks.length }})</h2>
          <div v-if="!tracks.length" class="text-sm text-muted">Belum ada musik.</div>
          <ul v-else class="space-y-2">
            <li v-for="t in tracks" :key="t.id" class="flex items-center gap-3 text-sm">
              <span class="min-w-32 font-medium">{{ t.name }}</span>
              <audio :src="t.url" controls class="h-8" />
              <UButton class="ml-auto" size="xs" variant="ghost" label="Ganti nama" @click="rename(t)" />
              <UButton size="xs" color="error" variant="ghost" label="Hapus" @click="del(t.id)" />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 3: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.
Run: `npx vitest run` — all pass.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/music.vue app/layouts/admin.vue
git commit -m "feat: Musik library page + sidebar nav (upload/rename/delete tracks)"
```

---

## Task 8: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Suite + typecheck**

Run: `npx vitest run` — all pass (prior 162 + rowBelongsToOwner + rewritten invitation-settings cases).
Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` — exit 0, 0 errors.

- [ ] **Step 2: Confirm no stray `musicMediaId`**

Run: `grep -rn "musicMediaId" server/ app/ || echo "none (clean)"`
Expected: "none (clean)".

- [ ] **Step 3: Confirm files + migration**

Run: `ls app/pages/admin/music.vue server/api/admin/music/index.get.ts server/db/migrations/0005_*.sql`
Expected: all exist.

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize music library"
```
(Skip if clean. Remind the user to run `npm run db:migrate` before using the feature.)

---

## Self-Review (done at write time)

- **Spec §3 (schema/migration):** Task 1. ✅
- **Spec §4 (rowBelongsToOwner):** Task 2. ✅
- **Spec §5 (library endpoints):** Task 3 (GET/POST/PATCH/DELETE; delete nulls invitations + R2 delete). ✅
- **Spec §6 (invitation select + editor GET + InvitationSettings):** Task 4 (PATCH /music), Task 5 (GET resolve), Task 6 (dropdown + edit wiring). ✅
- **Spec §7 (Musik page + nav):** Task 7. ✅
- **Spec §8 (public renderer):** Task 5 (loadInvitationBySlug). ✅
- **Spec §9 (testing):** pure (Task 2), component (Task 6), endpoints via owner/auth guards per thin-shell convention. ✅
- **Spec §11 success criteria:** 1→T3+T7, 2→T4+T5+T6, 3→T3 (delete) + T4 (reject), 4→T6 (reusable select). ✅
- **Placeholder scan:** none.
- **Type consistency:** track shape `{ id, name, url }` from GET (Task 3) → InvitationSettings `tracks` prop + Musik page (Tasks 6/7); `musicTrackId` (uuid|null) across schema/PATCH/GET/edit; `rowBelongsToOwner({ownerId}, userId)` in Tasks 2/3/4. ✅
- **Migration safety:** `db:generate` only (Task 1); user runs `db:migrate`. ✅
- **Risk flagged:** Tasks 1-4 intentionally leave `musicMediaId`-reference typecheck errors in `index.get.ts`/`invitation.ts` until Task 5 clears them; each task notes which errors are expected. The full suite stays green throughout (no test imports those server files). `createR2Adapter` config keys must be copied verbatim from `media.post.ts` (Task 3).
```

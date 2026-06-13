# Admin Dashboard Layout Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin area the Nuxt UI dashboard-template polish: a collapsible branded sidebar (nav + user dropdown + dark-mode toggle) and a real `/admin` home with owner-scoped stat cards + recent invitations.

**Architecture:** Reuse the Nuxt UI v4 dashboard primitives already in the app. One thin owner-scoped stats endpoint feeds the home page; the layout and home page are otherwise presentational. Other admin pages already use `UDashboardPanel`/`UDashboardNavbar` and need no change.

**Tech Stack:** Nuxt 4, Nuxt UI v4 (`@nuxt/ui@4.8`, includes color mode), Drizzle ORM, Vitest.

**Branch:** `feat/phase-2b-media` (continuation). No migration.

**Grounding facts:**
- `app/layouts/admin.vue` currently: `UDashboardGroup > UDashboardSidebar` (header "Lovree", a single-item vertical `UNavigationMenu`, footer logout `UButton`) + `<slot/>`. So `UDashboardGroup`/`UDashboardSidebar`/`UNavigationMenu` are confirmed-working v4 components here.
- `app/pages/admin/index.vue` currently: `definePageMeta({ middleware: 'admin' })` (NO layout) + plain `<h1>` + email + logout button.
- `GET /api/admin/invitations` (server/api/admin/invitations/index.get.ts): auth via `session.user?.id` (401 if absent), returns `[{ id, slug, type, status, updatedAt }]` for the owner.
- Logout flow: `await $fetch('/api/auth/logout', { method: 'POST' }); await clear(); await navigateTo('/login')` (`clear` from `useUserSession()`).
- `@nuxt/ui@4.8` provides `UDashboardSidebarCollapse`, `UColorModeButton`, `UDropdownMenu`, `UCard`, `UBadge`, `UIcon`. **Exact prop/slot names must be verified against the installed version during implementation** — adjust minimally if typecheck or render differs, keeping the described behavior.
- Schema: `invitations { id, ownerId, status, updatedAt }`, `guests { invitationId }`, `rsvps { invitationId }`.

---

## File Structure

- Create `server/api/admin/stats.get.ts` — owner-scoped counts.
- Modify `app/layouts/admin.vue` — collapsible sidebar + nav + user dropdown + dark toggle.
- Modify `app/pages/admin/index.vue` — dashboard home (stat cards + recent invitations) inside the admin layout.

No new tests (endpoint is a thin owner-scoped aggregate; layout/home are presentational — covered by typecheck + the existing suite staying green, matching the codebase's convention of not unit-testing Nitro shells / Nuxt UI internals).

---

## Task 1: Owner-scoped stats endpoint

**Files:**
- Create: `server/api/admin/stats.get.ts`

- [ ] **Step 1: Implement the endpoint**

Create `server/api/admin/stats.get.ts`:

```ts
import { eq, count } from 'drizzle-orm'
import { useDb } from '../../db'
import { invitations, guests, rsvps } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const ownerId = session.user?.id
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const db = useDb()

  const invRows = await db.select({ status: invitations.status }).from(invitations).where(eq(invitations.ownerId, ownerId))
  const total = invRows.length
  const published = invRows.filter((r) => r.status === 'published').length
  const drafts = invRows.filter((r) => r.status === 'draft').length

  const [g] = await db.select({ value: count() }).from(guests)
    .innerJoin(invitations, eq(guests.invitationId, invitations.id))
    .where(eq(invitations.ownerId, ownerId))
  const [r] = await db.select({ value: count() }).from(rsvps)
    .innerJoin(invitations, eq(rsvps.invitationId, invitations.id))
    .where(eq(invitations.ownerId, ownerId))

  return {
    invitations: total,
    published,
    drafts,
    guests: Number(g?.value ?? 0),
    rsvps: Number(r?.value ?? 0),
  }
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Run the suite (no regressions)**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add server/api/admin/stats.get.ts
git commit -m "feat: owner-scoped admin stats endpoint (invitation/publish/draft/guest/rsvp counts)"
```

---

## Task 2: Sidebar revamp

**Files:**
- Modify: `app/layouts/admin.vue`

- [ ] **Step 1: Rebuild the layout**

Replace `app/layouts/admin.vue` with:

```vue
<script setup lang="ts">
const { user, clear } = useUserSession()

const links = [[
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: 'Undangan', icon: 'i-lucide-mail', to: '/admin/invitations' },
]]

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

const userItems = computed(() => [[
  { label: user.value?.email ?? 'Akun', type: 'label' as const },
], [
  { label: 'Keluar', icon: 'i-lucide-log-out', onSelect: () => logout() },
]])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable>
      <template #header="{ collapsed }">
        <span v-if="!collapsed" class="font-semibold">Lovree</span>
        <UDashboardSidebarCollapse class="ml-auto" />
      </template>

      <UNavigationMenu orientation="vertical" :items="links" />

      <template #footer>
        <div class="flex w-full items-center gap-2">
          <UDropdownMenu :items="userItems" class="flex-1">
            <UButton :label="user?.name || user?.email || 'Akun'" icon="i-lucide-user" color="neutral" variant="ghost" block class="justify-start" />
          </UDropdownMenu>
          <UColorModeButton />
        </div>
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>
```

Notes for the implementer:
- `computed` is auto-imported in Nuxt; if the project's lint prefers explicit imports in layouts, add `import { computed } from 'vue'`.
- Verify against `@nuxt/ui@4.8`: the `#header` slot's `collapsed` slot-prop, the `UDashboardSidebarCollapse` component, `UDropdownMenu :items` grouping (array-of-arrays), and `UColorModeButton`. If a name/prop differs, adjust minimally — the behavior to preserve: collapsible sidebar, brand "Lovree", vertical nav (Dashboard + Undangan), a user dropdown whose menu has the email label + a "Keluar" action running `logout()`, and a dark/light toggle. Do not commit with typecheck errors.

- [ ] **Step 2: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

- [ ] **Step 3: Commit**

```bash
git add app/layouts/admin.vue
git commit -m "feat: collapsible branded admin sidebar with user dropdown + dark-mode toggle"
```

---

## Task 3: Dashboard home page

**Files:**
- Modify: `app/pages/admin/index.vue`

- [ ] **Step 1: Rebuild the page**

Replace `app/pages/admin/index.vue` with:

```vue
<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats } = await useFetch<any>('/api/admin/stats')
const { data: list } = await useFetch<any>('/api/admin/invitations')

const recent = computed<any[]>(() =>
  [...(((list.value as any[]) ?? []))]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5))

const cards = computed(() => [
  { label: 'Undangan', value: (stats.value as any)?.invitations ?? 0, icon: 'i-lucide-mail' },
  { label: 'Published', value: (stats.value as any)?.published ?? 0, icon: 'i-lucide-globe' },
  { label: 'Draft', value: (stats.value as any)?.drafts ?? 0, icon: 'i-lucide-pencil' },
  { label: 'Tamu', value: (stats.value as any)?.guests ?? 0, icon: 'i-lucide-users' },
  { label: 'RSVP', value: (stats.value as any)?.rsvps ?? 0, icon: 'i-lucide-circle-check' },
])
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #right>
          <UButton to="/admin/invitations" icon="i-lucide-plus" label="Buat Undangan" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <UCard v-for="c in cards" :key="c.label">
            <div class="flex items-center gap-3">
              <UIcon :name="c.icon" class="size-5 text-gray-400" />
              <div>
                <div class="text-xs text-gray-500">{{ c.label }}</div>
                <div class="text-2xl font-semibold">{{ c.value }}</div>
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <div class="mb-3 flex items-center">
            <h2 class="font-medium">Undangan Terbaru</h2>
            <UButton class="ml-auto" variant="link" to="/admin/invitations" label="Lihat semua" />
          </div>
          <div v-if="!recent.length" class="text-sm text-gray-500">Belum ada undangan.</div>
          <ul v-else class="space-y-2">
            <li v-for="inv in recent" :key="inv.id" class="flex items-center gap-2 text-sm">
              <span>{{ inv.slug }}</span>
              <UBadge :color="inv.status === 'published' ? 'success' : 'neutral'" variant="subtle" :label="inv.status" />
              <UButton class="ml-auto" variant="link" :to="`/admin/invitations/${inv.id}/edit`" label="Edit" />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Typecheck + suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/index.vue
git commit -m "feat: admin dashboard home with stat cards + recent invitations"
```

---

## Task 4: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 159, unchanged — no new tests). Zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Confirm files**

Run: `ls server/api/admin/stats.get.ts && grep -c "UDashboardSidebarCollapse\|UColorModeButton" app/layouts/admin.vue && grep -c "layout: 'admin'" app/pages/admin/index.vue`
Expected: stats file exists; sidebar has the collapse + color-mode components; home page sets the admin layout.

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize admin dashboard revamp"
```

(Skip if the tree is already clean.)

---

## Self-Review (done at write time)

- **Spec §3 (sidebar):** Task 2 — collapsible, brand, nav, user dropdown w/ Keluar, color-mode toggle. ✅
- **Spec §4 (stats endpoint):** Task 1 — owner-scoped counts, 401 guard. ✅
- **Spec §5 (dashboard home):** Task 3 — admin layout, stat cards, recent invitations. ✅
- **Spec §6 (other pages unchanged):** no task needed (confirmed). ✅
- **Spec §7 (testing):** typecheck + suite green per the codebase convention; no unit tests for the Nitro shell / Nuxt UI internals. ✅
- **Spec §9 success criteria:** 1→T2, 2→T1+T3, 3→T2 (color mode; public untouched — no public files changed), 4→T4. ✅
- **Placeholder scan:** none.
- **Type consistency:** stats response `{ invitations, published, drafts, guests, rsvps }` produced in Task 1 and consumed by the Task 3 cards under the same keys. ✅
- **No migration.** ✅
- **Risk flagged for the implementer:** exact `@nuxt/ui@4.8` API for `UDashboardSidebarCollapse` / `UColorModeButton` / `UDropdownMenu` items shape / `#header` `collapsed` slot-prop — verify and adjust without changing behavior; the already-working `UDashboardGroup`/`UDashboardSidebar`/`UNavigationMenu` in the current layout are the safe baseline. Do not commit with typecheck errors.
```

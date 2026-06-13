# Lovree v3 — Design Spec: Admin Dashboard Layout Revamp

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** All prior phases. Same branch `feat/phase-2b-media`.
- **Scope:** Adopt the Nuxt UI dashboard-template layout patterns for the admin area: a polished collapsible sidebar (branding, nav, user dropdown, dark-mode toggle) and a real dashboard home with owner-scoped stat cards + recent invitations. No new framework — the app already uses Nuxt UI v4 dashboard primitives. Out: command palette, teams/multi-user, notifications, charts.

## 1. Background & Goal

The admin layout is minimal: `app/layouts/admin.vue` has a single-link `UNavigationMenu` and a bare logout button; `/admin` (`app/pages/admin/index.vue`) is a plain `<h1>` + email + button that doesn't even use the admin layout. Other admin pages already use `UDashboardPanel`/`UDashboardNavbar`. This revamp brings the shell up to the Nuxt UI dashboard template's polish.

**Goal:** A collapsible, branded sidebar with Dashboard + Undangan nav, a user dropdown (account + Keluar), and a dark-mode toggle; and an `/admin` home that shows real owner stats (invitation/published/draft counts, total guests, total RSVPs) plus recent invitations.

## 2. Decisions carried in from brainstorming

- **Adopt:** collapsible sidebar + user dropdown, dark-mode toggle, dashboard home with stat cards. **Skip:** command palette (Ctrl+K), teams, notifications slideover, charts (YAGNI / single-user).
- **Dark mode:** admin UI only (Nuxt UI components honor color mode). The public `/u/:slug` invitation uses its own design-token colors (explicit inline styles), so it is visually unaffected.
- **Stats are owner-scoped** to the logged-in user (consistent with every admin endpoint reading `session.user.id`).

## 3. Sidebar (`app/layouts/admin.vue`)

Rebuild using the dashboard-template composition (all Nuxt UI v4, already available at `@nuxt/ui@4.8`):
- `UDashboardGroup` > `UDashboardSidebar` with `collapsible` and a collapse toggle (`UDashboardSidebarCollapse`).
- **Header:** "Lovree" brand text/logo.
- **Body:** `UNavigationMenu` (vertical) with: **Dashboard** (`i-lucide-layout-dashboard` → `/admin`), **Undangan** (`i-lucide-mail` → `/admin/invitations`).
- **Footer:** a `UDropdownMenu` trigger showing the user's avatar/initial + email; menu items: **Keluar** (current logout flow — `$fetch('/api/auth/logout', POST)` → `clear()` → `navigateTo('/login')`). Plus a `UColorModeButton` for dark/light toggle (in the footer or sidebar header).
- The existing `<slot />` stays for page panels.

The logout logic currently duplicated in `admin.vue` and `admin/index.vue` consolidates into the sidebar dropdown (the home page no longer needs its own logout button).

## 4. Stats endpoint

`GET /api/admin/stats` (auth required — `session.user?.id` else 401, mirroring `index.get.ts`):
- Returns owner-scoped counts: `{ invitations, published, drafts, guests, rsvps }`.
- `invitations` = count of the user's invitations; `published`/`drafts` = counts by `status`; `guests`/`rsvps` = counts of rows whose `invitationId` belongs to one of the user's invitations (Drizzle `count()` with an inner join on `invitations.ownerId = userId`).
- Thin handler; no document parsing. (Counts via SQL aggregates — no pure helper needed, but the response shape is fixed and asserted in an endpoint-shape sense via typecheck.)

## 5. Dashboard home (`app/pages/admin/index.vue`)

- Add `definePageMeta({ layout: 'admin', middleware: 'admin' })` (currently it has middleware but no `layout`, so it renders outside the dashboard shell).
- `UDashboardPanel` + `UDashboardNavbar title="Dashboard"`.
- **Stat cards** (responsive grid, `UCard` or `UPageCard`): Total Undangan, Published, Draft, Total Tamu, Total RSVP — values from `GET /api/admin/stats`.
- **Recent invitations:** fetch `GET /api/admin/invitations`, show the most recent few (by `updatedAt`) as rows/links to the editor, with a "Lihat semua" link to `/admin/invitations` and a "Buat Undangan" action linking there.
- Remove the plain `<h1>`/email/logout markup.

## 6. Other admin pages

`invitations/index.vue`, `[id]/edit.vue`, `[id]/guests.vue`, `[id]/rsvp.vue` already use `UDashboardPanel`/`UDashboardNavbar` and need no change; they automatically sit inside the new sidebar shell.

## 7. Testing

- **Endpoint:** `GET /api/admin/stats` returns 401 without a session (auth guard); shape `{ invitations, published, drafts, guests, rsvps }` (verified by typecheck; the owner-scoping mirrors the already-tested ownership pattern).
- **Layout/home:** primarily visual — verified by `nuxt typecheck` (0 errors) + the full existing suite staying green + manual check. A light component test is optional (the dashboard primitives are Nuxt UI internals, low value to unit-test).
- No regressions: the full suite must stay green.

## 8. Out of Scope

- Command palette / global search; teams or multi-user; notifications; charts/graphs.
- Role-based access (single-user model unchanged).
- Restyling the public invitation renderer.

## 9. Success Criteria

1. The admin sidebar is collapsible, branded "Lovree", lists Dashboard + Undangan, has a user dropdown with Keluar, and a working dark/light toggle.
2. `/admin` renders inside the dashboard shell with stat cards showing the owner's real counts (invitations, published, draft, guests, RSVPs) and a recent-invitations list.
3. Toggling dark mode restyles the admin UI; the public `/u/:slug` invitation is unaffected.
4. Typecheck is clean and the existing test suite stays green.

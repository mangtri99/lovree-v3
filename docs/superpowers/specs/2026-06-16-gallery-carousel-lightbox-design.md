# Lovree v3 — Design Spec: Gallery Carousel + Lightbox (mobile)

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** `GallerySection` (base + elegant + dark_prada, all currently a grid), the section registry (`gallerySchema`), `InvitationRoot` render. Same branch `feat/phase-2b-media`.
- **Scope:** On mobile, the gallery becomes a carousel — a main image with prev/next arrows, a thumbnail strip below, and tap-to-zoom in a fullscreen lightbox (matching `gallery.png`). Desktop keeps the existing grid. A shared `GalleryCarousel` component (self-built Vue, no new deps) powers it across all three themes. An optional gallery title is added.

## 1. Background & Goal

All three `GallerySection` variants render a static grid. The reference (`gallery.png`) shows, on mobile: a title, one large image with left/right arrows, a row of thumbnails, and tapping the image opens a zoomable lightbox.

**Goal:** Mobile galleries show the carousel + thumbnails + lightbox; desktop keeps the themed grid. One reusable component, no heavy carousel/lightbox libraries (self-built, SSR-safe).

## 2. Decisions carried in from brainstorming

- **Self-built Vue** (no Splide/Fancybox) — an `index` ref drives the main image + thumbnails; a fullscreen overlay is the lightbox. SSR-safe: the current/first image renders server-side; interaction is client state (no DOM-touching lib, no `ClientOnly` needed).
- **Responsive split:** `< md` shows `GalleryCarousel`; `≥ md` keeps each theme's existing grid. The lightbox belongs to the carousel (mobile); the desktop grid stays static.
- **Shared component:** `GalleryCarousel.vue` used by all three `GallerySection` variants (DRY); each variant keeps its own section chrome (bg/padding/borders) and desktop grid.
- **Optional title:** add `title` to `gallerySchema` (default `''`); render as a heading above the gallery when set (matches "Momen Bahagia Kami"). Backward-safe.
- Zoom = native browser pinch/scroll on the lightbox image; no custom zoom math.

## 3. Registry (`server/registry/sections.ts`)

- `gallerySchema` becomes `z.object({ title: z.string().default(''), items: galleryImages })`.
- Gallery `fields`: add `title: { type: 'text' as const, label: 'Judul Galeri' }` (before `items`).
- **Test impact:** the existing assertion `validateContent('gallery', {})` → `{ items: [] }` must update to `{ title: '', items: [] }` (in `tests/registry/sections.test.ts`).

## 4. `GalleryCarousel.vue` (new, `app/components/invitation/`)

- Props: `{ images: Array<{ mediaId: string; url: string }> }` (caller passes already-url-filtered images).
- State: `index = ref(0)`; `lightbox = ref(false)`.
- Methods: `go(n)` sets `index` clamped/wrapped within `images.length`; `prev()/next()` wrap around; `openLightbox()/closeLightbox()`.
- Layout:
  - **Main image:** the image at `index`, `object-cover`, rounded; `@click="openLightbox()"` (cursor-zoom). Prev/next arrow buttons overlaid left/right (only when `images.length > 1`), `@click.stop` so arrow taps don't open the lightbox.
  - **Thumbnails:** a horizontal, scrollable row (`overflow-x-auto`) of small images; clicking one sets `index`; the active thumb has a ring/opacity highlight. Shown only when `images.length > 1`.
  - **Lightbox** (`v-if="lightbox"`): a `fixed inset-0 z-[60]` dark overlay (`bg-black/90`); the current image centered (`max-h-[90vh] max-w-[95vw] object-contain`) so the browser can pinch/scroll-zoom; prev/next arrows (when >1); a close `✕` button (top-right); clicking the backdrop or pressing `Esc` closes. Add/remove a `keydown` (Esc → close, ←/→ → prev/next) listener on mount/unmount of the lightbox (client-only via `onMounted`/`watch`).
- Edge cases: `images.length === 0` → render nothing; `=== 1` → main image only (no arrows/thumbs), still opens lightbox.
- Theme-neutral chrome (inherits `color`/font from the surrounding section's CSS vars); arrows/close use a subtle translucent background so they read on any image.

## 5. `GallerySection` variants (base + elegant + dark_prada)

Each keeps its `<section>` chrome and, if `content.title` is set, a heading above (using `var(--font-heading)`/`var(--color-primary)` per the theme's existing heading style). Then:
- Mobile container: `<div class="md:hidden"><GalleryCarousel :images="renderable" /></div>`.
- Desktop container: `<div class="hidden md:block">` wrapping the **existing grid** (unchanged markup/classes per theme).
- `renderable` (already computed in each) stays the url-filtered list. Import `GalleryCarousel` in each variant.

(`dark_prada` and `elegant` keep their bordered/rounded grid on desktop; base keeps its plain grid.)

## 6. Testing

- **`GalleryCarousel.vue` (`tests/components/gallery-carousel.test.ts`):**
  - Renders a main image and one thumbnail per image (given 3 images → main + 3 thumbs).
  - `next()` (clicking the next arrow) advances the main image src to the next url; wraps at the end.
  - Clicking a thumbnail sets the main image to that url.
  - Clicking the main image opens the lightbox (a `fixed` overlay appears); the close button (and Esc) hides it.
  - One image → no arrow buttons, no thumbnail strip; still opens the lightbox on click.
  - Zero images → renders nothing.
- **`GallerySection` (base + elegant + dark_prada):** renders a `GalleryCarousel` in the mobile container and the grid in the desktop container; renders the `title` heading when `content.title` is set, omits it when empty.
- **Registry:** `validateContent('gallery', {})` → `{ title: '', items: [] }`; update the existing gallery test accordingly.
- Pure component tests (happy-dom; no static assets in these components → no nuxt env needed, except `GallerySection` variant tests that import `dark_prada` which uses `/assets` — those need `// @vitest-environment nuxt`).
- Full suite green; typecheck clean.

## 7. Out of Scope

- Lightbox on the desktop grid (carousel/mobile only).
- Swipe-gesture / momentum / autoplay; per-image captions; custom zoom controls (rely on native pinch).
- Carousel on desktop (desktop stays grid).
- New media handling — images come from the existing `items` array.

## 8. Success Criteria

1. On mobile, the gallery shows a main image with prev/next arrows + a thumbnail strip, matching `gallery.png`.
2. Tapping the main image opens a fullscreen lightbox with the image (pinch/scroll-zoomable), navigable and closeable (✕ / backdrop / Esc).
3. Desktop keeps the themed grid; all three themes use the shared carousel on mobile.
4. An optional gallery title renders as a heading when set.
5. Full suite + typecheck green.

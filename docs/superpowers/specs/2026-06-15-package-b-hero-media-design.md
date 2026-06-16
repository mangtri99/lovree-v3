# Lovree v3 — Design Spec: Package B — Hero Media

- **Date:** 2026-06-15
- **Status:** Approved for planning
- **Builds on:** Section registry, theme packs (base + elegant), Package A (hero date/format), gallery/image controls. Same branch `feat/phase-2b-media`.
- **Scope:** Hero gains an optional **background photo** (text overlaid full-bleed); a new **Hero Slideshow** section renders multiple photos auto-advancing with the same overlaid text. (Package B of UPDATE.md; items 1-bg + 4.)

## 1. Background & Goal

The hero is a solid-colour band with text. Item 1 wants an optional background photo; item 4 wants a hero-like section with multiple auto-rotating photos.

**Goal:** A customer can set a hero background image (text overlays it, with a readability scrim) or add a Hero Slideshow section (multiple uploaded photos auto-advancing behind the same hero text). When no photo is set, the hero stays the current solid band.

## 2. Decisions carried in from brainstorming

- **Full-bleed photo with overlaid text** + a subtle dark scrim for legibility (light text over the photo). No-photo hero is unchanged (token colours).
- **Hero Slideshow is a new section type** (`hero_slideshow`), added like any section. Same text fields as hero (title, coupleName, date, dateFormat) + an `images` array. **Auto-advance ~4s, fade, loop**; one image = static; no images = solid fallback with text.
- Reuse existing controls: `image` (ImageControl, `{mediaId,url}`) for the hero background; `gallery` (GalleryControl, `{mediaId,url}[]` multi-upload + reorder) for the slideshow images. No new field type.
- No migration (JSONB; new fields default via `validateContent`).

## 3. Registry (`server/registry/sections.ts`)

- `heroSchema`: add `backgroundImage: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' })`.
- Hero `fields`: add `backgroundImage: { type: 'image', label: 'Foto Background' }`.
- New schemas:
```ts
const heroSlideshowSchema = z.object({
  title: z.string().default(''),
  coupleName: z.string().default(''),
  date: z.string().default(''),
  dateFormat: z.string().default('DD MMMM YYYY'),
  images: galleryImages, // reuse the resilient {mediaId,url}[] from field-types
})
```
- New registry entry `hero_slideshow` (label "Hero Slideshow"):
```ts
  hero_slideshow: {
    schema: heroSlideshowSchema,
    label: 'Hero Slideshow',
    fields: {
      title: { type: 'text', label: 'Judul' },
      coupleName: { type: 'text', label: 'Nama Pasangan' },
      date: { type: 'date', label: 'Tanggal' },
      dateFormat: { type: 'dateformat', label: 'Format Tanggal' },
      images: { type: 'gallery', label: 'Foto' },
    },
  },
```
(`galleryImages` is exported from `server/theme/... field-types.ts`; import it where the other section schemas import gallery helpers.)

## 4. Render — Hero with background (base + elegant)

`HeroSection.vue` (base) + `themes/elegant/HeroSection.vue`: props gain `backgroundImage: { mediaId: string; url: string }`.
- When `content.backgroundImage?.url`: render a full-bleed section with the photo as a cover background, a dark scrim overlay (e.g. `bg-black/40`) and the text above it in light/white (title eyebrow, couple name, formatted date). The elegant variant keeps its italic/divider styling but light over the photo.
- When no url: render exactly as today (token solid bg + token text).

(Implementation detail: a relatively-positioned `<section>` with `:style="{ backgroundImage: url(...) }"`, an absolutely-positioned overlay div, and the content in a `relative z-10` wrapper. The couple name keeps `--font-heading`; over a photo, colours switch to white rather than `--color-primary`/`--color-text`.)

## 5. Render — Hero Slideshow (base + elegant)

New `app/components/invitation/sections/HeroSlideshowSection.vue` (base) + `app/components/invitation/themes/elegant/HeroSlideshowSection.vue`:
- Props: `{ title, coupleName, date, dateFormat, images: { mediaId, url }[] }`.
- `renderable` = images with a non-empty `url`.
- A `currentIndex` ref; `onMounted` starts `setInterval` advancing `currentIndex = (currentIndex + 1) % renderable.length` every 4000ms when `renderable.length > 1`; `onUnmounted` clears it. SSR-safe (index starts 0, timer client-only).
- Render: full-bleed; stack the images absolutely, the active one visible (opacity transition for a fade); dark scrim; the hero text (title eyebrow, couple name, `formatDate(date, dateFormat)`) overlaid in light text — same treatment as the hero background.
- Empty `renderable`: solid `--color-bg` fallback with the text (no crash).
- Register: `sectionComponents.hero_slideshow = HeroSlideshowSection` (base); `themePacks` elegant pack `hero_slideshow: ElegantHeroSlideshow`. `hero_slideshow` joins `SECTION_TYPES` → "+ Hero Slideshow" add button; `section-map-alignment` enforces the base mapping.

## 6. Testing

- **Registry:** `validateContent('hero', {})` defaults `backgroundImage` to `{ mediaId:'', url:'' }`; `validateContent('hero_slideshow', {})` → `{ title:'', coupleName:'', date:'', dateFormat:'DD MMMM YYYY', images: [] }`; a malformed slideshow image is dropped (resilient `galleryImages`).
- **Component (base + elegant):** Hero with a `backgroundImage.url` renders the photo + the text (couple name); Hero without it renders the text and no background image. Hero Slideshow renders the first image + the text (couple name, formatted date) when images exist, and the text-only fallback when empty.
- **Alignment:** `section-map-alignment` passes once `hero_slideshow` is mapped.
- Full suite green; typecheck clean.

## 7. Out of Scope

- Slideshow controls (dots/arrows), per-image captions, transition styles beyond fade, configurable interval.
- Video backgrounds; Ken-Burns/zoom effects.
- Packages C (footer rich text), D (SEO).

## 8. Success Criteria

1. Hero has an optional background photo; with a photo the text overlays it (readable scrim), without one it stays the current solid band — in base and elegant.
2. A new "Hero Slideshow" section accepts multiple uploaded photos (reorderable) and auto-advances them behind the overlaid hero text — in base and elegant.
3. Empty/edge states (no images, one image) don't crash; one image is static.

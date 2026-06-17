# Lovree v3 — Design Spec: Rich Text Toolbar — Underline, Alignment, Heading

- **Date:** 2026-06-17
- **Status:** Approved for planning
- **Builds on:** `RichTextControl.vue` (footer rich text, TipTap StarterKit), the write-time sanitizer `server/document/sanitize-html.ts`, the footer `v-html` render. Same branch `feat/phase-2b-media`.
- **Scope:** Add underline, text alignment (left/center/right), and headings (H1/H2/H3 via a dropdown) to the rich-text editor, with matching sanitizer allowlist updates.

## 1. Background & Goal

`RichTextControl` (the footer's `richtext` field) currently offers only Bold, Italic, Bullet list; StarterKit's heading is disabled and there's no underline or alignment. The sanitizer allows `p br b strong i em ul li` and **no attributes**.

**Goal:** The editor gains Underline, a heading dropdown (Paragraf / H1 / H2 / H3), and align left/center/right; the sanitizer permits the new tags + a `text-align` inline style only, keeping the no-link / no-script / no-other-attributes guarantees.

## 2. Decisions carried in from brainstorming

- **Underline:** `@tiptap/extension-underline` (already installed) → `<u>`.
- **Headings H1/H2/H3** via a **dropdown** (Paragraf / Judul 1 / Judul 2 / Judul 3), not separate buttons. StarterKit `heading: { levels: [1, 2, 3] }`.
- **Alignment left/center/right** via `@tiptap/extension-text-align` (needs install) on paragraph + heading → inline `style="text-align: …"`. No justify.
- **Sanitizer:** allow new tags (`u`, `h1`, `h2`, `h3`) and a `style` attribute filtered to `text-align: left|center|right` ONLY (via `allowedStyles`); everything else (links, colours, other styles/attrs, script) still stripped.
- Toolbar layout: `B  I  U  [heading ▾]  •  ⯇ ▤ ⯈` (existing B/I/bullet kept).

## 3. Dependency

- `npm install @tiptap/extension-text-align`. (`@tiptap/extension-underline` already present.)

## 4. `RichTextControl.vue`

- Extensions: keep `StarterKit.configure({ … })` but set `heading: { levels: [1, 2, 3] }` (remove `heading: false`); add `Underline` and `TextAlign.configure({ types: ['heading', 'paragraph'] })` to the `extensions` array.
- Toolbar (inside the existing `<div v-if="editor">`):
  - **U** button → `toggleUnderline()`, active class on `editor.isActive('underline')`.
  - **Heading dropdown** — a `<select>` with options: Paragraf (`''`), Judul 1 (`'1'`), Judul 2 (`'2'`), Judul 3 (`'3'`). Its value reflects the current block: `''` when not a heading, else the active level. `@change`: empty → `editor.chain().focus().setParagraph().run()`; a level → `editor.chain().focus().toggleHeading({ level: Number(val) }).run()`. (A small helper `currentHeading()` returns `'1'|'2'|'3'|''` from `editor.isActive('heading', { level })`.)
  - **Align** buttons: left/center/right → `setTextAlign('left'|'center'|'right')`, active on `editor.isActive({ textAlign: … })`.
  - Existing **B / I / • (bullet)** unchanged.
- Empty-doc normalization (`editor.isEmpty → ''`) and `setContent` sync unchanged.

## 5. Sanitizer (`server/document/sanitize-html.ts`)

```ts
const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'li', 'h1', 'h2', 'h3'],
  allowedAttributes: { '*': ['style'] },
  allowedStyles: { '*': { 'text-align': [/^(left|center|right)$/] } },
  allowedSchemes: [],
}
```

- `allowedStyles` makes `sanitize-html` keep the `style` attribute but drop any declaration that isn't `text-align: left|center|right` (so `color`, `font-size`, etc. are removed; a style with only disallowed props collapses away).
- Still no links, no `<script>`/content, no attributes other than the filtered `style`.

## 6. Render

- Footer `v-html` already renders arbitrary clean HTML; `<u>`, `<h1>/<h2>/<h3>`, and the `text-align` inline style render as-is. No render change required. (Footer headings show at browser/prose default size — acceptable per the chosen scope.)

## 7. Testing

- **Sanitizer (`tests/document/sanitize-html.test.ts`):**
  - Keeps `<u>`, `<h1>`, `<h2>`, `<h3>`.
  - Keeps `<p style="text-align:center">` (the `text-align` declaration survives); a `<p style="text-align:center">` stays centered.
  - Strips a disallowed style: `<p style="color:red;text-align:left">` → keeps `text-align:left`, drops `color`.
  - Still strips `<script>`, `<a href>`, `onclick`, and disallowed tags (existing assertions hold).
- **`RichTextControl` (`tests/components/rich-text-control.test.ts`):** the toolbar renders the underline button, the heading `<select>` (with 4 options), and three align buttons (alongside B/I/bullet). Keep light (mount in the `ClientOnly` stub as the existing test does).
- Full suite green; typecheck clean.

## 8. Out of Scope

- Links, ordered lists, blockquote, code, colours, font size, justify alignment.
- Styling footer headings beyond browser/prose defaults; applying richtext to fields other than footer.
- A generic richtext field elsewhere.

## 9. Success Criteria

1. The footer editor offers Underline, a heading dropdown (Paragraf/H1/H2/H3), and align left/center/right, alongside Bold/Italic/Bullet.
2. Saved footer HTML may contain `<u>`, `<h1-3>`, and `text-align` (left/center/right) only; links, scripts, colours, and other attributes/styles are still stripped at write.
3. The published footer renders the underline/headings/alignment.
4. Full suite + typecheck green.

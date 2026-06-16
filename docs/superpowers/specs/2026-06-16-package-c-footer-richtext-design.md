# Lovree v3 — Design Spec: Package C — Footer Rich Text

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Section registry + type-driven `FieldEditor`, document validate funnel (`validateDraftDocument`), base + elegant theme packs. Same branch `feat/phase-2b-media`.
- **Scope:** Footer text becomes rich text — the customer formats it with **bold, italic, paragraphs/line breaks, and bullet lists** in a small TipTap editor; the HTML is sanitized server-side at write and rendered with `v-html`. (Package C of UPDATE.md; footer rich text.)

## 1. Background & Goal

The footer is a single plain-text field (`footerSchema = z.object({ text: z.string().default('') })`), rendered as `{{ content.text || 'Made with Lovree' }}` in both the base and elegant `FooterSection.vue`. The customer wants light formatting — emphasis, multiple lines, a short bulleted list (e.g. contact lines, a thank-you note).

**Goal:** A customer edits the footer in a small rich-text editor (B, I, bullet list) and the published invitation shows that formatting. Stored HTML is sanitized so a footer can never inject script or unexpected markup.

## 2. Decisions carried in from brainstorming

- **Formatting scope:** bold, italic, paragraphs (Enter) + hard line breaks (Shift+Enter), and bullet lists. **No links** (drops the riskiest XSS surface; revisit later if needed). No headings, blockquote, code, ordered lists, colors, alignment.
- **Editor:** TipTap (`@tiptap/vue-3` + `StarterKit`), client-only (ProseMirror touches the DOM → must not run during SSR).
- **Sanitize at write, server-side, with `sanitize-html`** (pure JS, server-only — no client bundle weight, no jsdom-in-browser, no SSR/hydration sanitizer). Render is then a trivial `v-html` of already-clean HTML. The single write ingress (`validateDraftDocument`) sanitizes; publish copies the clean draft (no double sanitize).
- **`validateContent` stays pure** — it is bundled to the client via `field-editors.ts`, so the sanitizer must NOT go in the Zod schema or `validateContent`. Sanitize lives in `server/document/` only.
- **New `richtext` field type**, but wired to footer only (YAGNI). It slots into the existing type-driven `FieldEditor` like any other control.
- No migration — `footerSchema.text` stays a string; it now holds sanitized HTML instead of plain text. Dev DB disposable; existing plain-text footers render fine through `v-html`.

## 3. Registry (`server/registry/sections.ts`)

- `FieldType` union: add `'richtext'` →
  `'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list' | 'gallery' | 'dateformat' | 'richtext'`.
- Footer `fields`: change `text` from its current control to `text: { type: 'richtext' as const, label: 'Teks Footer' }`.
- `footerSchema` is unchanged: `z.object({ text: z.string().default('') })`.

## 4. Sanitizer (`server/document/sanitize-html.ts`, new, server-only)

A thin wrapper around `sanitize-html` with a fixed allowlist matching the toolbar:

```ts
import sanitizeHtml from 'sanitize-html'

// Footer rich text: emphasis + paragraphs/breaks + bullet lists. No links, no attributes.
const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'li'],
  allowedAttributes: {},
  allowedSchemes: [],
  // strip anything else but keep inner text
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', RICHTEXT_OPTIONS)
}
```

- No `href`/attributes allowed at all (no links), so no scheme/`javascript:`/`data:` surface.
- Disallowed tags are removed, inner text preserved (`<script>alert(1)</script>` → `alert(1)` text is stripped too — `sanitize-html` drops `script` content by default via `nonTextTags`; confirm `script`/`style` content does not leak in tests).

## 5. Write funnel (`server/document/validate.ts`)

`validateDraftDocument` is the single server-side ingress for footer HTML (autosave `draft.patch.ts`). After `validateContent` fills/validates the content, sanitize every field whose **registry field type is `richtext`**:

```ts
import { sectionRegistry, validateContent, type SectionType } from '../registry/sections'
import { sanitizeRichText } from './sanitize-html'

function sanitizeContent(type: SectionType, content: Record<string, any>): Record<string, any> {
  const fields = (sectionRegistry as any)[type]?.fields ?? {}
  let out = content
  for (const [key, def] of Object.entries(fields)) {
    if ((def as any).type === 'richtext' && typeof out[key] === 'string') {
      out = { ...out, [key]: sanitizeRichText(out[key]) }
    }
  }
  return out
}
```

- `sectionRegistry` is already exported from `server/registry/sections.ts` (used by `field-editors.ts`); `validate.ts` already imports `validateContent` from there, so add `sectionRegistry` to that import — no new export needed.
- In `validateDraftDocument`'s `.map`, replace `content: validateContent(s.type as SectionType, s.content)` with
  `content: sanitizeContent(s.type as SectionType, validateContent(s.type as SectionType, s.content))`.
- Generic over field type (any future `richtext` field is covered), but only footer has one today.

## 6. Editor control (`app/components/editor/controls/RichTextControl.vue`, new)

- Props `{ label: string; modelValue: string }`, emits `update:modelValue` (HTML string).
- TipTap editor: `useEditor({ extensions: [StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false, strike: false, orderedList: false, horizontalRule: false })], content: props.modelValue, onUpdate })`. Keep `bold`, `italic`, `paragraph`, `hardBreak`, `bulletList`, `listItem`.
- **Empty normalization:** TipTap emits `'<p></p>'` for an empty doc. In `onUpdate`, if `editor.isEmpty` (or html is `'<p></p>'`), emit `''` so the footer fallback (`'Made with Lovree'`) triggers instead of an empty bar.
- Toolbar: three toggle buttons — **B** (`toggleBold`), *I* (`toggleItalic`), • list (`toggleBulletList`) — each reflecting `editor.isActive(...)` for the active state. Indonesian `title`/aria where shown.
- Wrap the editor in `<ClientOnly>` (ProseMirror needs the DOM). Provide a plain fallback slot (e.g. a disabled box or the raw text) for SSR so the admin page renders.
- `onBeforeUnmount` → `editor.destroy()`.
- `FieldEditor.vue`: import `RichTextControl`, add `richtext: RichTextControl` to the control map. (Falls back to `TextControl` if unmapped — so mapping is required for the feature.)

## 7. Render (`FooterSection.vue` base + `themes/elegant/FooterSection.vue`)

- Replace `{{ content.text || 'Made with Lovree' }}` with: when `content.text` is non-empty, `<div v-html="content.text" />`; else the `'Made with Lovree'` fallback text.
- Stored HTML is already sanitized at write → `v-html` is safe; no sanitizer in any render path (no SSR/hydration sanitizer, compatible with edge-cached SSR).
- Minimal styling so lists/paragraphs read well: e.g. `ul { list-style: disc; padding-left: 1.25rem; text-align: left; display: inline-block }`, paragraph spacing. Keep each theme's existing wrapper (base centered small text; elegant uppercase tracked) and colors.

## 8. Dependencies

- `sanitize-html` (+ `@types/sanitize-html` dev) — server-only.
- `@tiptap/vue-3`, `@tiptap/starter-kit` — editor (client). (StarterKit includes bold/italic/paragraph/hardBreak/bulletList/listItem; no extra mark packages needed since links are out of scope.)

## 9. Testing

- **Sanitizer (`sanitizeRichText`):** keeps `<b><strong><i><em><p><br><ul><li>`; strips `<script>` (and its inner text), `<a href>`, `<img>`, `onclick`/`style`/any attribute, `<h1>`/`<div>`/`<span>`; `javascript:`-bearing markup cannot survive (no attributes allowed). Empty/`undefined` input → `''`.
- **Write funnel (`validateDraftDocument`):** a draft whose footer `text` contains `'<b>Hi</b><script>alert(1)</script><a href="javascript:x">x</a>'` is stored as `'<b>Hi</b>...'` with script/anchor stripped; a non-richtext field (e.g. opening `body`) is left untouched.
- **Component (base + elegant `FooterSection`):** renders footer HTML (`<b>`, a `<ul><li>`) via `v-html`; empty `text` → `'Made with Lovree'` fallback (and `'<p></p>'` treated as empty is handled upstream in the control, but the render fallback keys off empty string).
- **RichTextControl:** mounts inside `ClientOnly` and shows the three toolbar buttons (B/I/list). Keep this test light — TipTap is heavy; do not assert deep ProseMirror behavior. If TipTap proves hard to mount in happy-dom, assert the toolbar/markup of the wrapper and skip driving the editor.
- Full suite green; typecheck clean.

## 10. Out of Scope

- Links, headings, ordered lists, blockquote, code, text color/alignment, font size.
- Rich text on any field other than footer.
- A generic sanitize-on-render path or isomorphic DOM sanitizer.
- Packages D (SEO).

## 11. Success Criteria

1. The footer editor offers bold, italic, and bullet-list formatting (TipTap), client-only, no SSR crash.
2. Footer HTML is sanitized at write (server, `sanitize-html`) — script/attributes/links/disallowed tags cannot reach storage or render.
3. The published footer (base + elegant) shows the formatting via `v-html`; an empty footer falls back to `'Made with Lovree'`.
4. `validateContent` stays pure (no sanitizer in the client bundle); full suite + typecheck green.

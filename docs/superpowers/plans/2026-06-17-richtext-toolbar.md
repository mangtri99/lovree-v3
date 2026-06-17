# Rich Text Toolbar (Underline / Alignment / Heading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Underline, text alignment (left/center/right), and a heading dropdown (Paragraf/H1/H2/H3) to the footer rich-text editor, with the write-time sanitizer updated to allow the new tags + a `text-align`-only style.

**Architecture:** Extend `RichTextControl.vue` (TipTap) with Underline + TextAlign extensions and StarterKit headings, adding toolbar controls; widen `sanitizeRichText`'s allowlist (`u`, `h1-3`) and permit a `style` attribute filtered to `text-align: left|center|right` only. Footer `v-html` render is unchanged.

**Tech Stack:** Nuxt 4, Vue 3, TipTap (`@tiptap/vue-3`, StarterKit, extension-underline, extension-text-align), `sanitize-html`, Vitest + @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-06-17-richtext-toolbar-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

---

## File Structure

- `server/document/sanitize-html.ts` (modify) — allow `u`/`h1`/`h2`/`h3` + `text-align` style.
- `app/components/editor/controls/RichTextControl.vue` (modify) — Underline + TextAlign + heading dropdown + align buttons.
- `package.json` (via npm) — add `@tiptap/extension-text-align`.
- Tests: `tests/document/sanitize-html.test.ts` (modify), `tests/components/rich-text-control.test.ts` (modify).

---

### Task 1: Sanitizer — allow underline, headings, text-align

**Files:**
- Modify: `server/document/sanitize-html.ts`
- Test: `tests/document/sanitize-html.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/document/sanitize-html.test.ts` (inside the existing `describe`):

```ts
  it('keeps underline + heading tags', () => {
    const out = sanitizeRichText('<h1>A</h1><h2>B</h2><h3>C</h3><p><u>under</u></p>')
    for (const tag of ['<h1>', '<h2>', '<h3>', '<u>']) expect(out).toContain(tag)
  })
  it('keeps a text-align style but drops other styles', () => {
    expect(sanitizeRichText('<p style="text-align:center">x</p>')).toContain('text-align:center')
    const out = sanitizeRichText('<p style="color:red;text-align:left">x</p>')
    expect(out).toContain('text-align:left')
    expect(out).not.toContain('color')
  })
  it('drops a non-allowed text-align value', () => {
    expect(sanitizeRichText('<p style="text-align:justify">x</p>')).not.toContain('justify')
  })
```

(Existing tests for keeping `b/strong/i/em/ul/li`, stripping `<script>`/`<a>`/`onclick`/disallowed tags must still pass.)

- [ ] **Step 2: Run to verify the new ones fail**

Run: `npx vitest run tests/document/sanitize-html.test.ts`
Expected: FAIL — `<u>`/`<h1-3>` stripped; `style` stripped (no attributes allowed yet).

- [ ] **Step 3: Implement**

In `server/document/sanitize-html.ts`, update `RICHTEXT_OPTIONS`:

```ts
const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'li', 'h1', 'h2', 'h3'],
  allowedAttributes: { '*': ['style'] },
  allowedStyles: { '*': { 'text-align': [/^(left|center|right)$/] } },
  allowedSchemes: [],
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run tests/document/sanitize-html.test.ts`
Expected: PASS (existing + 3 new). If a strip test checks exact equality and `sanitize-html` now emits `style=""` on a stripped-style element, adjust only that assertion to `not.toContain('color')` rather than full-string equality — but the new tests above already use `toContain`/`not.toContain`.

- [ ] **Step 5: Commit**

```bash
git add server/document/sanitize-html.ts tests/document/sanitize-html.test.ts
git commit -m "feat: sanitize allows underline/headings + text-align style"
```

---

### Task 2: Editor — underline, heading dropdown, alignment

**Files:**
- Modify: `app/components/editor/controls/RichTextControl.vue`
- Test: `tests/components/rich-text-control.test.ts`
- Dep: `@tiptap/extension-text-align`

- [ ] **Step 1: Install the dependency**

```bash
npm install @tiptap/extension-text-align
```

Expected: `@tiptap/extension-text-align` added to `package.json` (`@tiptap/extension-underline` is already installed).

- [ ] **Step 2: Write the failing test**

Replace the assertion block in `tests/components/rich-text-control.test.ts`'s existing test (keep the mount + `ClientOnly` stub) and add a new test:

```ts
  it('renders underline, heading dropdown, and alignment controls', async () => {
    const w = mount(RichTextControl, {
      props: { label: 'Teks Footer', modelValue: '<p>Hi</p>' },
      global: { stubs: { ClientOnly } },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(w.html()).toMatch(/aria-label="Underline"|title="Underline"/i)
    expect(w.find('select').exists()).toBe(true)
    expect(w.find('select').findAll('option').length).toBe(4)
    expect(w.html()).toMatch(/aria-label="Rata Tengah"|title="Rata Tengah"/i)
  })
```

(Keep the existing "renders the label and B/I/list toolbar buttons" test as-is.)

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/components/rich-text-control.test.ts`
Expected: FAIL — no `<select>` / Underline / align controls yet.

- [ ] **Step 4: Implement**

In `app/components/editor/controls/RichTextControl.vue`:

`<script setup>` — add imports and extensions, and a heading helper:

```ts
import { watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
```

Change the `StarterKit.configure({ … })` call to set headings on (replace `heading: false` with `heading: { levels: [1, 2, 3] }`), and add `Underline` + `TextAlign` to the `extensions` array:

```ts
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      blockquote: false,
      codeBlock: false,
      code: false,
      strike: false,
      orderedList: false,
      horizontalRule: false,
    }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
```

Add a current-heading helper + a change handler (after the `editor` is created):

```ts
function currentHeading(): string {
  if (!editor.value) return ''
  for (const level of [1, 2, 3]) if (editor.value.isActive('heading', { level })) return String(level)
  return ''
}
function setBlock(val: string) {
  if (!editor.value) return
  if (!val) editor.value.chain().focus().setParagraph().run()
  else editor.value.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 }).run()
}
```

Template — extend the toolbar `<div v-if="editor">` (keep B/I/bullet; add U, the heading `<select>`, and the three align buttons):

```vue
        <div v-if="editor" class="flex flex-wrap gap-1 border-b border-gray-200 p-1">
          <button type="button" title="Bold" aria-label="Bold" class="rounded px-2 py-1 text-sm font-bold" :class="{ 'bg-gray-200': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">B</button>
          <button type="button" title="Italic" aria-label="Italic" class="rounded px-2 py-1 text-sm italic" :class="{ 'bg-gray-200': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">I</button>
          <button type="button" title="Underline" aria-label="Underline" class="rounded px-2 py-1 text-sm underline" :class="{ 'bg-gray-200': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">U</button>
          <select title="Paragraf/Judul" aria-label="Gaya teks" class="rounded border border-gray-200 px-1 text-sm" :value="currentHeading()" @change="setBlock(($event.target as HTMLSelectElement).value)">
            <option value="">Paragraf</option>
            <option value="1">Judul 1</option>
            <option value="2">Judul 2</option>
            <option value="3">Judul 3</option>
          </select>
          <button type="button" title="Bullet List" aria-label="Bullet List" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-200': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">•</button>
          <button type="button" title="Rata Kiri" aria-label="Rata Kiri" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'left' }) }" @click="editor.chain().focus().setTextAlign('left').run()">⯇</button>
          <button type="button" title="Rata Tengah" aria-label="Rata Tengah" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'center' }) }" @click="editor.chain().focus().setTextAlign('center').run()">▤</button>
          <button type="button" title="Rata Kanan" aria-label="Rata Kanan" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'right' }) }" @click="editor.chain().focus().setTextAlign('right').run()">⯈</button>
        </div>
```

(Keep the `EditorContent`, `#fallback`, label, and the `onUpdate`/`watch`/`onBeforeUnmount`/empty-normalization logic exactly as they are. `computed` import is added but only used if needed; the helpers are plain functions, which is fine.)

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/components/rich-text-control.test.ts`
Expected: PASS (both tests). If TipTap's `isActive`/`toggleHeading` typings need the level cast, the `as 1 | 2 | 3` handles it.

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/controls/RichTextControl.vue tests/components/rich-text-control.test.ts package.json package-lock.json
git commit -m "feat: rich text editor adds underline, heading dropdown, alignment"
```

---

### Task 3: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all pass (prior total + sanitize 3 + control 1).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0. (If TipTap `extension-text-align`/`extension-underline` types complain, they're direct deps now; ensure both are installed.)

- [ ] **Step 3: Report**

Confirm complete: the footer editor offers Underline, a heading dropdown (Paragraf/H1/H2/H3), and align left/center/right; the sanitizer permits `u`/`h1-3` + `text-align` only (links/scripts/colours/other attrs still stripped); footer renders them via `v-html`. No DB change. Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 dep → Task 2 Step 1; §4 editor → Task 2; §5 sanitizer → Task 1; §6 render (no change) → noted; §7 testing → Tasks 1–2 + Task 3 gate. All covered.
- **Security:** sanitizer is the trust boundary — Task 1 lands the allowlist (tags + `text-align`-only style) with tests proving `color`/`justify`/links/script are dropped, before the editor can emit those tags (Task 2). Order is safe either way (sanitize runs at write regardless), but Task 1 first keeps the guarantee explicit.
- **Type consistency:** `setBlock`/`currentHeading` use string values matching the `<select>` options (`'' | '1' | '2' | '3'`); `toggleHeading({ level: Number(val) as 1|2|3 })` matches TipTap's API; `TextAlign.configure({ types: ['heading','paragraph'] })` covers both block types the dropdown can produce.
- **No render/DB change:** footer `v-html` already renders clean HTML; new tags/inline `text-align` need no schema or component change.
- **Test env:** both touched test files are asset-free and run under the existing happy-dom default (the control test stubs `ClientOnly`).

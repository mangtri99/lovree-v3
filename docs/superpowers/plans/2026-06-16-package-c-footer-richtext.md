# Package C — Footer Rich Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The footer becomes a small rich-text field (bold, italic, paragraphs/line breaks, bullet lists) edited with TipTap, sanitized server-side at write, and rendered with `v-html`.

**Architecture:** A new `richtext` field type slots into the existing type-driven `FieldEditor`. The editor control (`RichTextControl.vue`) is TipTap, client-only. HTML is sanitized at the single write ingress (`validateDraftDocument`) with `sanitize-html` (server-only, fixed allowlist `p br b strong i em ul li`, no attributes, no links); `validateContent` stays pure. Render is a trivial `v-html` of already-clean HTML in base + elegant `FooterSection.vue`.

**Tech Stack:** Nuxt 4, Vue 3, Zod registry, TipTap (`@tiptap/vue-3` + `@tiptap/starter-kit`), `sanitize-html`, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-16-package-c-footer-richtext-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

---

## File Structure

- `package.json` — add deps: `sanitize-html`, `@tiptap/vue-3`, `@tiptap/starter-kit`; dev: `@types/sanitize-html`.
- `server/registry/sections.ts` (modify) — `FieldType` union += `'richtext'`; footer `text` field → `richtext`.
- `server/document/sanitize-html.ts` (create) — `sanitizeRichText(html)` wrapper, server-only.
- `server/document/validate.ts` (modify) — sanitize `richtext` fields after `validateContent`.
- `app/components/editor/controls/RichTextControl.vue` (create) — TipTap editor, client-only.
- `app/components/editor/FieldEditor.vue` (modify) — map `richtext` → `RichTextControl`.
- `app/components/invitation/sections/FooterSection.vue` (modify) — `v-html` render.
- `app/components/invitation/themes/elegant/FooterSection.vue` (modify) — `v-html` render.
- Tests: `tests/document/sanitize-html.test.ts` (create), `tests/document/validate.test.ts` (modify), `tests/components/footer-richtext.test.ts` (create), `tests/components/rich-text-control.test.ts` (create), `tests/utils/field-editors.test.ts` (touch only if it asserts footer — it does not).

---

### Task 1: Install dependencies + register the `richtext` field type

**Files:**
- Modify: `package.json` (via npm)
- Modify: `server/registry/sections.ts:4` (FieldType union), `server/registry/sections.ts:260-262` (footer fields)
- Test: `tests/registry/sections.test.ts` (add a footer field-type assertion)

- [ ] **Step 1: Install deps**

```bash
npm install sanitize-html @tiptap/vue-3 @tiptap/starter-kit
npm install -D @types/sanitize-html
```

Expected: installs succeed; `package.json` gains the four entries.

- [ ] **Step 2: Write the failing test**

Add to `tests/registry/sections.test.ts` (inside the existing top-level `describe`, or a new one):

```ts
import { sectionRegistry } from '../../server/registry/sections'

describe('footer field is rich text', () => {
  it('footer.text uses the richtext field type', () => {
    expect((sectionRegistry as any).footer.fields.text.type).toBe('richtext')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: FAIL — `expected 'text' to be 'richtext'`.

- [ ] **Step 4: Implement — extend the union and the footer field**

In `server/registry/sections.ts` line 4, add `'richtext'`:

```ts
export type FieldType = 'text' | 'longtext' | 'date' | 'url' | 'youtube' | 'image' | 'list' | 'gallery' | 'dateformat' | 'richtext'
```

In the `footer` entry (around line 260), change the `text` field:

```ts
  footer: {
    schema: footerSchema,
    label: 'Footer',
    fields: {
      text: { type: 'richtext' as const, label: 'Teks Footer' },
    },
  },
```

(`footerSchema` stays `z.object({ text: z.string().default('') })` — unchanged.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: add richtext field type, footer.text becomes richtext"
```

---

### Task 2: Server-only sanitizer

**Files:**
- Create: `server/document/sanitize-html.ts`
- Test: `tests/document/sanitize-html.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/document/sanitize-html.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sanitizeRichText } from '../../server/document/sanitize-html'

describe('sanitizeRichText', () => {
  it('keeps allowed formatting tags', () => {
    const html = '<p>Hi <b>bold</b> <strong>s</strong> <i>it</i> <em>e</em></p><ul><li>one</li></ul><br>'
    expect(sanitizeRichText(html)).toBe(html)
  })
  it('strips script tags and their content', () => {
    expect(sanitizeRichText('<b>Hi</b><script>alert(1)</script>')).toBe('<b>Hi</b>')
  })
  it('strips disallowed tags but keeps inner text', () => {
    expect(sanitizeRichText('<h1>Big</h1><div>x</div><span>y</span>')).toBe('Bigxy')
  })
  it('strips all attributes (onclick, style, class)', () => {
    expect(sanitizeRichText('<b onclick="x" style="color:red" class="z">t</b>')).toBe('<b>t</b>')
  })
  it('strips links entirely (no anchors allowed), keeping the text', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">click</a>')).toBe('click')
  })
  it('returns empty string for empty/undefined input', () => {
    expect(sanitizeRichText('')).toBe('')
    expect(sanitizeRichText(undefined as any)).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/document/sanitize-html.test.ts`
Expected: FAIL — cannot find module `sanitize-html.ts`.

- [ ] **Step 3: Implement the sanitizer**

Create `server/document/sanitize-html.ts`:

```ts
import sanitizeHtml from 'sanitize-html'

// Footer rich text: emphasis + paragraphs/breaks + bullet lists. No links, no attributes.
// Server-only — never import this from client/registry code (keeps validateContent pure).
const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'li'],
  allowedAttributes: {},
  allowedSchemes: [],
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', RICHTEXT_OPTIONS)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/document/sanitize-html.test.ts`
Expected: PASS. If the "keeps allowed tags" exact-equality test fails on whitespace/attribute normalization (sanitize-html may re-serialize), relax that one assertion to `toContain` each tag rather than full-string equality — but keep the strip tests strict.

- [ ] **Step 5: Commit**

```bash
git add server/document/sanitize-html.ts tests/document/sanitize-html.test.ts
git commit -m "feat: server-only sanitizeRichText (allowlist: p br b strong i em ul li)"
```

---

### Task 3: Sanitize richtext fields in the write funnel

**Files:**
- Modify: `server/document/validate.ts`
- Test: `tests/document/validate.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/document/validate.test.ts`:

```ts
it('sanitizes footer richtext on write, strips script/anchor/attributes', () => {
  const out = validateDraftDocument({
    sections: [
      { id: 'f', type: 'footer', enabled: true, content: { text: '<b>Hi</b><script>alert(1)</script><a href="javascript:x">x</a>' } },
    ],
  })
  expect(out.sections[0].content.text).toBe('<b>Hi</b>x')
})

it('leaves non-richtext fields untouched', () => {
  const out = validateDraftDocument({
    sections: [
      { id: 'o', type: 'opening', enabled: true, content: { body: 'plain <b>not parsed as richtext>' } },
    ],
  })
  expect(out.sections[0].content.body).toBe('plain <b>not parsed as richtext>')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/document/validate.test.ts`
Expected: FAIL — footer `text` still contains the `<script>`/anchor (sanitize not wired).

- [ ] **Step 3: Implement — sanitize richtext fields after validateContent**

Edit `server/document/validate.ts` to:

```ts
import { nanoid } from 'nanoid'
import { SECTION_TYPES, sectionRegistry, validateContent, type SectionType } from '../registry/sections'
import { sanitizeRichText } from './sanitize-html'
import type { InvitationDocument } from './types'

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

export function validateDraftDocument(raw: unknown): InvitationDocument {
  const sectionsIn = (raw && typeof raw === 'object' && Array.isArray((raw as any).sections))
    ? (raw as any).sections
    : []
  const sections = sectionsIn
    .filter((s: any) => s && SECTION_TYPES.includes(s.type as SectionType))
    .map((s: any) => ({
      id: typeof s.id === 'string' && s.id ? s.id : nanoid(),
      type: s.type as SectionType,
      enabled: s.enabled !== false,
      content: sanitizeContent(s.type as SectionType, validateContent(s.type as SectionType, s.content)),
    }))
  return { sections }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/document/validate.test.ts`
Expected: PASS (all existing validate tests + the two new ones).

- [ ] **Step 5: Commit**

```bash
git add server/document/validate.ts tests/document/validate.test.ts
git commit -m "feat: sanitize richtext fields at the draft-write funnel"
```

---

### Task 4: TipTap editor control + FieldEditor mapping

**Files:**
- Create: `app/components/editor/controls/RichTextControl.vue`
- Modify: `app/components/editor/FieldEditor.vue`
- Test: `tests/components/rich-text-control.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/rich-text-control.test.ts`. TipTap is heavy and touches the DOM; keep the test light — assert the toolbar buttons render and the label shows. Stub `ClientOnly` to render its default slot so the editor mounts in happy-dom.

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RichTextControl from '../../app/components/editor/controls/RichTextControl.vue'

const ClientOnly = { template: '<div><slot /></div>' }

describe('RichTextControl', () => {
  it('renders the label and B/I/list toolbar buttons', async () => {
    const w = mount(RichTextControl, {
      props: { label: 'Teks Footer', modelValue: '<p>Hi</p>' },
      global: { stubs: { ClientOnly } },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Teks Footer')
    const btns = w.findAll('button')
    expect(btns.length).toBeGreaterThanOrEqual(3)
    expect(w.html()).toMatch(/Bold|aria-label="Bold"|title="Bold"/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/rich-text-control.test.ts`
Expected: FAIL — cannot find module `RichTextControl.vue`.

- [ ] **Step 3: Implement the control**

Create `app/components/editor/controls/RichTextControl.vue`:

```vue
<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{ label: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      strike: false,
      orderedList: false,
      horizontalRule: false,
    }),
  ],
  onUpdate: ({ editor }) => {
    // TipTap emits '<p></p>' for an empty doc — normalize to '' so the footer fallback triggers.
    emit('update:modelValue', editor.isEmpty ? '' : editor.getHTML())
  },
})

// Keep the editor in sync if the model changes externally (e.g. section switch).
watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== (editor.value.isEmpty ? '' : editor.value.getHTML())) {
      editor.value.commands.setContent(val || '', false)
    }
  },
)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div>
    <label class="mb-1 block text-sm font-medium">{{ label }}</label>
    <ClientOnly>
      <div class="rounded border border-gray-200">
        <div v-if="editor" class="flex gap-1 border-b border-gray-200 p-1">
          <button type="button" title="Bold" aria-label="Bold" class="rounded px-2 py-1 text-sm font-bold" :class="{ 'bg-gray-200': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">B</button>
          <button type="button" title="Italic" aria-label="Italic" class="rounded px-2 py-1 text-sm italic" :class="{ 'bg-gray-200': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">I</button>
          <button type="button" title="Bullet List" aria-label="Bullet List" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-200': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">•</button>
        </div>
        <EditorContent :editor="editor" class="prose prose-sm max-w-none p-2" />
      </div>
      <template #fallback>
        <div class="rounded border border-gray-200 p-2 text-sm text-gray-400">Memuat editor…</div>
      </template>
    </ClientOnly>
  </div>
</template>
```

- [ ] **Step 4: Map it in FieldEditor**

Edit `app/components/editor/FieldEditor.vue`: add the import and the map entry.

```ts
import RichTextControl from './controls/RichTextControl.vue'
```

In the `control` computed map, add `richtext: RichTextControl,`:

```ts
const control = computed(() => ({
  text: TextControl, longtext: LongtextControl, date: DateControl,
  url: UrlControl, youtube: YoutubeControl, image: ImageControl, list: ListControl,
  gallery: GalleryControl, dateformat: DateFormatControl, richtext: RichTextControl,
} as Record<string, any>)[props.descriptor.type] ?? TextControl)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/rich-text-control.test.ts`
Expected: PASS. If TipTap cannot mount under happy-dom (ProseMirror DOM APIs), fall back to asserting the wrapper + label + the `#fallback` content by NOT stubbing `ClientOnly` (stub it to render only the fallback slot: `{ template: '<div><slot name=\"fallback\" /></div>' }`), and drop the toolbar-button assertions. Document whichever path you took in the commit body.

- [ ] **Step 6: Commit**

```bash
git add app/components/editor/controls/RichTextControl.vue app/components/editor/FieldEditor.vue tests/components/rich-text-control.test.ts
git commit -m "feat: RichTextControl (TipTap, client-only) wired into FieldEditor"
```

---

### Task 5: Render the footer as HTML (base + elegant)

**Files:**
- Modify: `app/components/invitation/sections/FooterSection.vue`
- Modify: `app/components/invitation/themes/elegant/FooterSection.vue`
- Test: `tests/components/footer-richtext.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/footer-richtext.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/FooterSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/FooterSection.vue'

for (const [name, Comp] of [['base', Base], ['elegant', Elegant]] as const) {
  describe(`FooterSection (${name})`, () => {
    it('renders footer HTML via v-html', () => {
      const w = mount(Comp, { props: { content: { text: '<b>Terima kasih</b><ul><li>Keluarga</li></ul>' } } })
      expect(w.find('b').exists()).toBe(true)
      expect(w.find('li').text()).toBe('Keluarga')
    })
    it('falls back to the default when text is empty', () => {
      const w = mount(Comp, { props: { content: { text: '' } } })
      expect(w.text()).toContain('Made with Lovree')
      expect(w.find('b').exists()).toBe(false)
    })
  })
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/footer-richtext.test.ts`
Expected: FAIL — current template renders `{{ content.text }}` as escaped text, so `<b>` is not a real element.

- [ ] **Step 3: Implement base FooterSection**

Replace `app/components/invitation/sections/FooterSection.vue`:

```vue
<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <footer class="px-6 py-10 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left" style="background: var(--color-primary); color: white">
    <div v-if="content.text" v-html="content.text" />
    <template v-else>Made with Lovree</template>
  </footer>
</template>
```

- [ ] **Step 4: Implement elegant FooterSection**

Replace `app/components/invitation/themes/elegant/FooterSection.vue`:

```vue
<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <footer class="px-6 py-12 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left [&_p]:tracking-[0.25em]" style="background: var(--color-primary); color: white">
    <div v-if="content.text" v-html="content.text" />
    <template v-else><span class="uppercase tracking-[0.25em]">Made with Lovree</span></template>
  </footer>
</template>
```

(The elegant variant keeps its uppercase/tracking on the fallback and on paragraphs; user HTML controls the rest.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/footer-richtext.test.ts`
Expected: PASS (base + elegant, both cases).

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/sections/FooterSection.vue app/components/invitation/themes/elegant/FooterSection.vue tests/components/footer-richtext.test.ts
git commit -m "feat: render footer HTML via v-html (base + elegant), empty -> fallback"
```

---

### Task 6: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all tests pass (prior 227 + the new sanitize/validate/control/footer tests).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0, no errors. (If TipTap types complain about `EditorContent`/`useEditor` generics, ensure `@tiptap/vue-3` is a direct dependency from Task 1.)

- [ ] **Step 3: Report**

Confirm Package C complete: footer rich text editing (TipTap, client-only), write-time sanitize (server `sanitize-html`), `v-html` render base + elegant, `validateContent` still pure. Then hand back for the finish-branch / next-package decision (Package D — SEO).

---

## Self-Review Notes

- **Spec coverage:** §3 registry → Task 1; §4 sanitizer → Task 2; §5 write funnel → Task 3; §6 control + FieldEditor → Task 4; §7 render → Task 5; §9 testing → spread across Tasks 2-5 + Task 6 gate. All covered.
- **`validateContent` purity:** sanitizer imported only in `server/document/` (Tasks 2-3), never in `sections.ts` or `field-editors.ts` — client bundle unaffected.
- **Type consistency:** `sanitizeRichText` (Task 2) used in `sanitizeContent` (Task 3); `richtext` field type (Task 1) read by `sanitizeContent` (Task 3) and `FieldEditor` map (Task 4). Names align.
- **No links:** allowlist has no anchor/attributes (Task 2), toolbar has no link button (Task 4) — consistent with the chosen scope.

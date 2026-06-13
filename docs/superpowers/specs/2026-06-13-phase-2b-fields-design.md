# Lovree v3 — Design Spec: Phase 2b-fields (Section "Informasi Tambahan" / Custom)

- **Date:** 2026-06-13
- **Status:** Approved for planning
- **Builds on:** Phase 2a (editor), 2b-media, 2b-customization. Same branch `feat/phase-2b-media`.
- **Scope:** Let a customer add free-form content the fixed section schemas don't cover, via a new `custom` section type holding a titled list of label/value text rows. Multiple instances allowed. No override engine, no new field types beyond multiline text.

## 1. Background & Goal

The old product hardcoded per-customer content into theme code. The builder replaced that with a fixed set of typed sections. Some real needs fall outside those schemas: dress code, parking, livestream note, hashtag, health protocol, extra remarks. Rather than a full per-field override engine (rejected as YAGNI in brainstorming), the cheapest fit is a **new section type** whose data is user-defined rows — the section schema is fixed (so `validateContent` works unchanged), but its content is arbitrary.

**Goal:** A customer adds one or more "Informasi Tambahan" sections, each with a title and a list of `{ label, value }` rows (value is multiline text), and they render in the live preview and the published invitation.

## 2. Decisions carried in from brainstorming

- **Mechanism:** a new `custom` section type (not per-section custom fields, not a `field_overrides` engine).
- **Row value type:** multiline **text only** (no link/image types — YAGNI; gallery already covers images).
- **Multiple instances:** supported natively — the document is a list of typed section instances with no per-type uniqueness, so a customer can add several `custom` sections, each with its own title + rows. No code change needed for this; it's a property of the existing instance-list model.
- **Section label (picker button):** "Informasi Tambahan".

## 3. Architecture (fits existing patterns, no new infra)

The invitation document is `{ sections: [{ id, type, enabled, content }] }`. Rendering resolves `type → component` via `sectionComponents`; the editor derives field controls from the registry `fields` descriptor; `validateContent(type, raw)` parses content against the registry schema (defaults on failure). Adding a section type means: a registry entry (schema + label + fields), a render component, and a `sectionComponents` map entry. The `tests/components/section-map-alignment.test.ts` enforces both directions (every registry type has a component, every component maps to a registry type).

No endpoint, no migration (content lives in `draft_document` / `published_document` JSONB). Autosave, publish, the design-token cascade, and live preview all apply automatically.

## 4. Registry entry (`server/registry/sections.ts`)

Add a schema:
```ts
const customItemSchema = z.object({
  label: z.string().default(''),
  value: z.string().default(''),
})
const customSchema = z.object({
  title: z.string().default(''),
  items: z.array(customItemSchema).default([]),
})
```
Add to `sectionRegistry`:
```ts
  custom: {
    schema: customSchema,
    label: 'Informasi Tambahan',
    fields: {
      title: { type: 'text' as const, label: 'Judul' },
      items: {
        type: 'list' as const,
        label: 'Baris',
        defaultItem: { label: '', value: '' },
        itemFields: {
          label: { type: 'text' as const, label: 'Label' },
          value: { type: 'longtext' as const, label: 'Isi' },
        },
      },
    },
  },
```
`custom` therefore joins `SECTION_TYPES` automatically → appears in the editor's add-section buttons as "+ Informasi Tambahan". (`defaultItem` is harmless here since both row fields default cleanly; included for consistency with the gallery pattern.)

## 5. Render component (`app/components/invitation/sections/CustomSection.vue`)

- Props: `content: { title: string; items: Array<{ label: string; value: string }> }`.
- Render the `title` as a section heading (`--font-heading`, `--color-primary`) **only when non-empty**.
- Render each row where `label` OR `value` is non-empty: `label` emphasised (e.g. semibold), `value` as multiline text with `whitespace-pre-line` (so line breaks are preserved). Rows whose label AND value are both empty are skipped.
- Body text inherits `--font-body` from the `.invitation` root (wired in 2b-customization); no per-element font needed.
- Register in `app/components/invitation/sectionComponents.ts`: `custom: CustomSection`.

## 6. Editor

No editor-specific code. The existing `SectionList` (lists `SECTION_TYPES` as add buttons), `SectionEditor` (derives controls from the registry `fields`), `ListControl` (uses `defaultItem`), and `FieldEditor` (text + longtext controls) handle title + rows out of the box. Autosave, reconcile, and the accordion UI apply unchanged.

## 7. Testing

- **Pure:** `validateContent('custom', { title: 'Dress Code', items: [{ label: 'Pria', value: 'Batik' }, {}] })` → defaults the empty row's fields (label/value `''`), preserves the filled row, never resets the section. `validateContent('custom', {})` → `{ title: '', items: [] }`.
- **Component:** `CustomSection` renders the title when set and hides it when empty; renders a row's label + value; preserves multiline (`whitespace-pre-line` present); skips a fully-empty row.
- **Alignment:** `section-map-alignment` already asserts every `SECTION_TYPES` entry has a component — it will fail until `custom` is mapped, then pass (the regression guard for this feature).

## 8. Out of Scope

- Link / image / date row types (multiline text only).
- Per-section custom fields on existing sections; `field_overrides` engine.
- Reordering rows by drag (the existing list up/down is not present for rows — rows use add/remove only, matching other list controls).
- Per-instance custom styling.

## 9. Success Criteria

1. A customer adds an "Informasi Tambahan" section, sets a title and label/value rows, and they appear in the live preview and the published `/u/:slug`.
2. Multiple `custom` sections can be added, each with its own title and rows, all rendering independently.
3. Empty rows and an empty title are not rendered; multiline values keep their line breaks.
4. Adding a custom row never wipes the section (per-row defaults; consistent with the gallery data-loss fix).

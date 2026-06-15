# Lovree v3 — Design Spec: Per-Type Invitation Starters

- **Date:** 2026-06-14
- **Status:** Approved for planning
- **Builds on:** 2b-fields (starter sections). Same branch `feat/phase-2b-media`.
- **Scope:** Give each invitation type (wedding, wedding_metatah, metatah, baby_3mo, birthday) a purpose-built starter: a tuned section list **and** type-appropriate default copy (hero title, opening greeting/body, closing, footer). No new section types, no per-type editor relabeling, no migration (create-time logic only).

## 1. Background & Goal

`starterDocument(type)` currently differs only by section LIST; section content is the generic `defaultContent(t)` (mostly empty). So a `birthday` and a `wedding` start nearly identical and blank. 

**Goal:** Creating an invitation of a given type yields an editor pre-filled with the right sections and occasion-appropriate placeholder text, so the customer immediately sees a starting point that fits their event.

## 2. Decisions carried in from brainstorming

- **Lightweight:** per-type starter section list + per-type default text only. **No** new section types and **no** per-type editor label overrides (the `couple` section keeps its global "Pasangan" label even for baby/birthday — a documented cosmetic limitation).
- Text is **placeholder/editable** — seeded into the draft document at create-time; the customer edits freely.
- Bali-leaning copy (the product's WA template/themes are Balinese-Hindu), but neutral enough to edit.

## 3. Structure (`server/registry/starter-sections.ts`)

Replace the flat `STARTER_SECTIONS` map with a per-type config carrying sections + content overrides:
```ts
interface StarterConfig { sections: SectionType[]; content?: Partial<Record<SectionType, Record<string, any>>> }
export const STARTER_CONFIG: Record<string, StarterConfig> = { … }
```
Keep a derived `STARTER_SECTIONS: Record<string, SectionType[]>` export (`= mapValues(STARTER_CONFIG, c => c.sections)`) for backward compatibility (existing tests/import).

`starterDocument(type)`:
```ts
export function starterDocument(type: string): InvitationDocument {
  const cfg = STARTER_CONFIG[type] ?? STARTER_CONFIG.wedding
  return {
    sections: cfg.sections.map((t) => ({
      id: nanoid(),
      type: t,
      enabled: true,
      content: validateContent(t, cfg.content?.[t] ?? {}),
    })),
  }
}
```
Using `validateContent(t, override)` guarantees the content is schema-valid (defaults fill every missing field; the override sets the type-specific text). (`validateContent` is already exported from `server/registry/sections.ts`.)

## 4. Per-type starters

Section lists + content overrides (only fields with meaningful per-type text are overridden; everything else stays schema-default):

- **wedding** — `hero, opening, couple, event, countdown, gallery, love_gift, closing, footer`
  - hero.title: `The Wedding Of`
  - opening.greeting: `Om Swastiastu`; opening.body: a wedding invitation paragraph
  - closing.body: a thank-you/closing paragraph; footer.text: `Terima kasih · Lovree`
- **wedding_metatah** — same sections as wedding
  - hero.title: `Pernikahan & Metatah`; opening/closing/footer: combined-ceremony copy
- **metatah** — `hero, opening, couple, event, countdown, gallery, closing, footer` (no love_gift)
  - hero.title: `Upacara Metatah`; opening copy about Metatah/Mepandes
- **baby_3mo** — `hero, opening, couple, event, gallery, closing, footer`
  - hero.title: `Tiga Bulanan`; opening copy about the nelubulanin (3-month) ceremony
- **birthday** — `hero, opening, event, countdown, gallery, closing, footer` (no couple, no love_gift)
  - hero.title: `Ulang Tahun`; casual opening/closing copy

(Exact paragraph wording chosen at implementation; each override only sets fields that exist on that section's schema — e.g. `hero.title`, `opening.greeting`/`opening.body`, `closing.body`, `footer.text`.)

## 5. Render / editor

Unchanged. Sections use the existing components and registry labels. The `couple` section appears for baby_3mo/metatah as a generic people list (1+ person) — semantically fine, label cosmetic.

## 6. Testing

- `starterDocument(type)` for each of the 5 types: section list equals the configured list, in order, hero first; the hero `content.title` and opening copy match the type's overrides; every section's content is schema-valid (deep-equals `validateContent(t, override)`); ids unique/non-empty.
- `birthday` omits `couple` and `love_gift`; `metatah` omits `love_gift`.
- Unknown type falls back to the wedding starter (sections + content).
- `STARTER_SECTIONS` (derived) still maps each type → its section list (back-compat).

## 7. Out of Scope

- New section types (e.g. a dedicated "baby"/"celebrant" section).
- Per-type section label overrides in the editor.
- Per-type theme defaults; migration of existing invitations.

## 8. Success Criteria

1. Creating an invitation of a given type yields the right sections plus occasion-appropriate placeholder text (hero title, opening, closing, footer).
2. baby_3mo, birthday, and metatah differ in both section composition and copy from wedding.
3. All starter content is schema-valid (never crashes validation or the renderer).
4. An unknown/legacy type still produces the wedding starter.

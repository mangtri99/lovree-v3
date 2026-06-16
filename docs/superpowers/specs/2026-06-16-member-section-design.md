# Lovree v3 — Design Spec: MemberSection ("Peserta")

- **Date:** 2026-06-16
- **Status:** Approved for planning
- **Builds on:** Section registry + type-driven `FieldEditor`/`ListControl` (which already supports nested lists), base + elegant theme packs, `CoupleSection` (the closest analogue), starter-sections seeding. Same branch `feat/phase-2b-media`.
- **Scope:** A new `member` section type ("Peserta") that lists groups of participants (children) under a shared parent, each participant with a name, Instagram, and photo. Analogous to `CoupleSection` but with a group→participants nesting. (Ad-hoc request from `MEMBER_SECTION.md`.)

## 1. Background & Goal

Ceremonies such as metatah (tooth-filing) and baby 3-month events present several children ("peserta") grouped under their parents. `CoupleSection` renders a flat list of people and cannot express the group→children grouping. 

**Goal:** A new "Peserta" section where the owner adds one or more participant groups; each group has a shared `parents` line and `childOrder` label and contains a stack of participants (name, Instagram, photo). Renders in base and elegant themes, is addable like any section, and is auto-seeded into the metatah / wedding_metatah / baby_3mo starters.

## 2. Decisions carried in from brainstorming

- **Content shape: list of groups.** `members: Member[]`, each `Member = { peoples: Person[], parents: string, childOrder: string }`, each `Person = { name, instagram, photo: { mediaId, url } }`. `parents` and `childOrder` are group-level (shared by the participants in that group).
- **Participant fields:** name, Instagram, photo only (per the brief — no address).
- **Nested list, no new control.** `FieldEditor` already forwards `itemFields`/`defaultItem` for `type: 'list'`, and `ListControl` renders each item field through `FieldEditor`; a `list` field whose item contains another `list` field therefore nests with zero new code.
- **Participants render as a vertical stack** (not a grid), matching `CoupleSection`'s stacked layout.
- **Resilience matches `CoupleSection`** (`z.array(schema).default([])` + per-field defaults). Not per-item resilient; a malformed blob resets the section to defaults — same trade-off as couple. No special hardening.
- **Starter seeding:** insert `member` right after `couple` in metatah, baby_3mo, and wedding_metatah. `wedding` (plain) and `birthday` do NOT get it.
- No migration — JSONB document; new section validated by `validateContent`.

## 3. Registry (`server/registry/sections.ts`)

Add schemas (near `personSchema`/`coupleSchema`):

```ts
const memberPersonSchema = z.object({
  name: z.string().default(''),
  instagram: z.string().default(''),
  photo: z.object({ mediaId: z.string().default(''), url: z.string().default('') }).default({ mediaId: '', url: '' }),
})
const memberGroupSchema = z.object({
  peoples: z.array(memberPersonSchema).default([]),
  parents: z.string().default(''),
  childOrder: z.string().default(''),
})
const memberSchema = z.object({ members: z.array(memberGroupSchema).default([]) })
```

Add a registry entry `member` (place it right after `couple` in `sectionRegistry`):

```ts
  member: {
    schema: memberSchema,
    label: 'Peserta',
    fields: {
      members: {
        type: 'list' as const,
        label: 'Grup Peserta',
        defaultItem: { peoples: [], parents: '', childOrder: '' },
        itemFields: {
          parents: { type: 'text' as const, label: 'Orang Tua' },
          childOrder: { type: 'text' as const, label: 'Anak ke-' },
          peoples: {
            type: 'list' as const,
            label: 'Peserta',
            defaultItem: { name: '', instagram: '', photo: { mediaId: '', url: '' } },
            itemFields: {
              name: { type: 'text' as const, label: 'Nama' },
              instagram: { type: 'text' as const, label: 'Instagram' },
              photo: { type: 'image' as const, label: 'Foto' },
            },
          },
        },
      },
    },
  },
```

Adding `member` to `sectionRegistry` automatically makes it part of `SECTION_TYPES` (→ a "+ Peserta" add button) and subjects it to the `section-map-alignment` test, which requires a base component mapping (§5).

## 4. Render — `MemberSection.vue` (base) + `themes/elegant/MemberSection.vue`

Base (`app/components/invitation/sections/MemberSection.vue`), analogous to `CoupleSection.vue`:
- Props `{ content: { members: Member[] } }` with the `Person`/`Member` types inline.
- For each group: show `childOrder` (if set) and `parents` (if set, `whitespace-pre-line`), then a **vertical stack** of `peoples` — each participant: round photo (if `photo.url`), name in `--font-heading`/`--color-primary`, and an `@instagram` link (`https://instagram.com/{instagram}`, `--color-accent`) when set.
- Empty `members` (or empty `peoples`) renders nothing for that part — no crash.

Elegant (`app/components/invitation/themes/elegant/MemberSection.vue`):
- Same data, elegant styling consistent with `themes/elegant/CoupleSection.vue` (italic headings, divider/tracking treatment), participants still stacked.

## 5. Register

- `app/components/invitation/sectionComponents.ts`: import `MemberSection` and add `member: MemberSection` to the base map.
- `app/components/invitation/themePacks.ts`: import the elegant `MemberSection` and add `member: ElegantMemberSection` to `packs.elegant`.

## 6. Starter seeding (`server/registry/starter-sections.ts`)

- **metatah** and **baby_3mo:** insert `'member'` into their section arrays immediately after `'couple'`.
- **wedding_metatah:** it currently reuses `WEDDING_SECTIONS` (shared with plain `wedding`). Give `wedding_metatah` its own section list — `WEDDING_SECTIONS` with `'member'` inserted after `'couple'` — so plain `wedding` is unaffected. (Define e.g. `WEDDING_METATAH_SECTIONS` derived from `WEDDING_SECTIONS`.)
- No starter `content` override is required for `member` (defaults to an empty `members: []`); seeding just places the section so the editor shows it.
- `STARTER_SECTIONS` (the derived type→list map) updates automatically from the config.

## 7. Testing

- **Registry (`tests/registry/sections.test.ts`):**
  - `validateContent('member', {})` → `{ members: [] }`.
  - A group with a participant keeps its nested data: `validateContent('member', { members: [{ parents: 'X', childOrder: 'Anak ke-1', peoples: [{ name: 'A', instagram: 'a', photo: { mediaId: 'm', url: 'https://cdn/a.jpg' } }] }] })` round-trips those values; a participant missing fields gets defaults (e.g. `photo` → `{ mediaId:'', url:'' }`).
- **Component (`tests/components/member-section.test.ts`, base + elegant):** a group with two participants renders both names + the parents + childOrder; a participant with `photo.url` renders an `<img>`; empty `members` renders without throwing.
- **Alignment:** `section-map-alignment` passes once `member` is mapped in `sectionComponents` (and the elegant pack test covers `packs.elegant.member`).
- **Starter (`tests/registry/starter-sections.test.ts`):** `member` appears in the metatah, baby_3mo, and wedding_metatah section lists (right after `couple`) and does NOT appear in wedding or birthday.
- Full suite green; typecheck clean.

## 8. Out of Scope

- New field-type or control work (nested list reuses existing `ListControl`).
- Per-participant address/role/parents (group-level only).
- Drag-reorder of participants beyond what `ListControl` already offers.
- Migrations (JSONB document).

## 9. Success Criteria

1. A `member` ("Peserta") section exists, addable like any section, with a nested editor: groups of participants, each group with shared parents + childOrder, each participant with name/Instagram/photo.
2. It renders correctly in base and elegant, participants stacked vertically; empty states don't crash.
3. It is auto-seeded after `couple` in metatah / wedding_metatah / baby_3mo starters, and absent from wedding / birthday.
4. Full suite + typecheck green.

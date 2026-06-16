# MemberSection ("Peserta") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `member` ("Peserta") section — a list of participant groups, each group sharing a parents line + childOrder and containing a vertical stack of participants (name, Instagram, photo) — rendered in base + elegant and seeded into the metatah / wedding_metatah / baby_3mo starters.

**Architecture:** A new registry entry `member` with a nested `list` field (groups → participants); the existing `ListControl`/`FieldEditor` render nested lists with no new control. Base + elegant render components analogous to `CoupleSection`. Registered in `sectionComponents` (base) and `themePacks.packs.elegant`. Starter seeding inserts `member` after `couple` for three types.

**Tech Stack:** Nuxt 4, Vue 3, Zod registry, Vitest + @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-06-16-member-section-design.md`

**Branch:** `feat/phase-2b-media` (already checked out).

**Note on test sequencing:** Task 1 adds `member` to the registry but not yet to `sectionComponents` → the `section-map-alignment` test goes red until Task 2 maps it (same intentional pattern used for `hero_slideshow`). Run the full green gate only at Task 4.

---

## File Structure

- `server/registry/sections.ts` (modify) — `member*` schemas + `member` registry entry (after `couple`).
- `app/components/invitation/sections/MemberSection.vue` (create) — base render.
- `app/components/invitation/themes/elegant/MemberSection.vue` (create) — elegant render.
- `app/components/invitation/sectionComponents.ts` (modify) — map `member` (base).
- `app/components/invitation/themePacks.ts` (modify) — map `member` (elegant pack). **Required** — the `theme-packs` test asserts elegant overrides every base section.
- `server/registry/starter-sections.ts` (modify) — seed `member` after `couple` in metatah / wedding_metatah / baby_3mo.
- Tests: `tests/registry/sections.test.ts` (modify), `tests/components/member-section.test.ts` (create), `tests/registry/starter-sections.test.ts` (modify).

---

### Task 1: Registry — `member` schemas + entry

**Files:**
- Modify: `server/registry/sections.ts`
- Test: `tests/registry/sections.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/registry/sections.test.ts` (after the `package C footer richtext` describe):

```ts
describe('member section', () => {
  it('defaults to an empty members list', () => {
    expect(validateContent('member', {})).toEqual({ members: [] })
  })
  it('round-trips a group with a participant and defaults missing fields', () => {
    const out = validateContent('member', {
      members: [{ parents: 'Bpk X & Ibu Y', childOrder: 'Anak ke-1', peoples: [{ name: 'A', instagram: 'a' }] }],
    })
    expect(out.members).toEqual([
      { parents: 'Bpk X & Ibu Y', childOrder: 'Anak ke-1', peoples: [{ name: 'A', instagram: 'a', photo: { mediaId: '', url: '' } }] },
    ])
  })
  it('is registered with the Peserta label and a nested list field', () => {
    expect((sectionRegistry as any).member.label).toBe('Peserta')
    expect((sectionRegistry as any).member.fields.members.type).toBe('list')
    expect((sectionRegistry as any).member.fields.members.itemFields.peoples.type).toBe('list')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: FAIL — `validateContent('member', ...)` throws / `sectionRegistry.member` undefined.

- [ ] **Step 3: Add the schemas**

In `server/registry/sections.ts`, after the `coupleSchema` definition (around line 43), add:

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

- [ ] **Step 4: Add the registry entry**

In `sectionRegistry`, immediately after the `couple: { ... }` entry (which ends around line 134), add:

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

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/registry/sections.test.ts`
Expected: PASS. (The full suite's `section-map-alignment` is now red — expected until Task 2.)

- [ ] **Step 6: Commit**

```bash
git add server/registry/sections.ts tests/registry/sections.test.ts
git commit -m "feat: member (Peserta) section schema + registry entry"
```

---

### Task 2: Render components (base + elegant) + register

**Files:**
- Create: `app/components/invitation/sections/MemberSection.vue`
- Create: `app/components/invitation/themes/elegant/MemberSection.vue`
- Modify: `app/components/invitation/sectionComponents.ts`
- Modify: `app/components/invitation/themePacks.ts`
- Test: `tests/components/member-section.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/member-section.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/MemberSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/MemberSection.vue'

const content = {
  members: [
    {
      parents: 'Bpk X & Ibu Y',
      childOrder: 'Anak ke-1 & ke-2',
      peoples: [
        { name: 'Putu', instagram: 'putu', photo: { mediaId: 'm', url: 'https://cdn/a.jpg' } },
        { name: 'Kadek', instagram: '', photo: { mediaId: '', url: '' } },
      ],
    },
  ],
}

for (const [name, Comp] of [['base', Base], ['elegant', Elegant]] as const) {
  describe(`MemberSection (${name})`, () => {
    it('renders the group parents/childOrder and each participant name', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.text()).toContain('Bpk X & Ibu Y')
      expect(w.text()).toContain('Anak ke-1 & ke-2')
      expect(w.text()).toContain('Putu')
      expect(w.text()).toContain('Kadek')
    })
    it('renders a participant photo when set', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.find('img').exists()).toBe(true)
    })
    it('does not crash on empty members', () => {
      const w = mount(Comp, { props: { content: { members: [] } } })
      expect(w.find('img').exists()).toBe(false)
    })
  })
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/member-section.test.ts`
Expected: FAIL — cannot find module `MemberSection.vue`.

- [ ] **Step 3: Create the base component**

Create `app/components/invitation/sections/MemberSection.vue`:

```vue
<script setup lang="ts">
type Person = { name: string; instagram: string; photo: { mediaId: string; url: string } }
type Member = { peoples: Person[]; parents: string; childOrder: string }
defineProps<{ content: { members: Member[] } }>()
</script>
<template>
  <section class="space-y-12 px-6 py-12">
    <div v-for="(g, gi) in content.members" :key="gi" class="text-center">
      <p v-if="g.childOrder" class="mb-1">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mb-6 whitespace-pre-line">{{ g.parents }}</p>
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" loading="lazy" />
          <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Create the elegant component**

Create `app/components/invitation/themes/elegant/MemberSection.vue`:

```vue
<script setup lang="ts">
type Person = { name: string; instagram: string; photo: { mediaId: string; url: string } }
type Member = { peoples: Person[]; parents: string; childOrder: string }
defineProps<{ content: { members: Member[] } }>()
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(g, gi) in content.members" :key="gi" class="mx-auto mb-12 max-w-xl text-center last:mb-0">
      <p v-if="g.childOrder" class="text-sm uppercase tracking-[0.25em]">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mt-2 mb-6 whitespace-pre-line text-sm italic">{{ g.parents }}</p>
      <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-28 w-28 rounded-full object-cover" loading="lazy" />
          <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-2 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 5: Register the base component**

In `app/components/invitation/sectionComponents.ts`:
- Add the import near the other section imports: `import MemberSection from './sections/MemberSection.vue'`
- Add `member: MemberSection,` to the `sectionComponents` object (e.g. alongside `couple: CoupleSection`).

- [ ] **Step 6: Register the elegant component**

In `app/components/invitation/themePacks.ts`:
- Add the import: `import ElegantMember from './themes/elegant/MemberSection.vue'`
- Add `member: ElegantMember` to the `elegant: { ... }` pack object.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/components/member-section.test.ts tests/components/section-map-alignment.test.ts tests/components/theme-packs.test.ts`
Expected: PASS (member-section 6, section-map-alignment 2, theme-packs 5). `section-map-alignment` is green again and `theme-packs` "elegant overrides every section" still holds because `member` is in the elegant pack.

- [ ] **Step 8: Commit**

```bash
git add app/components/invitation/sections/MemberSection.vue app/components/invitation/themes/elegant/MemberSection.vue app/components/invitation/sectionComponents.ts app/components/invitation/themePacks.ts tests/components/member-section.test.ts
git commit -m "feat: MemberSection render (base + elegant) + register"
```

---

### Task 3: Starter seeding

**Files:**
- Modify: `server/registry/starter-sections.ts`
- Test: `tests/registry/starter-sections.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/registry/starter-sections.test.ts` (inside the file, after the existing top-level describes):

```ts
describe('member section seeding', () => {
  const types = (t: string) => starterDocument(t).sections.map((s) => s.type)
  it('seeds member right after couple for metatah, wedding_metatah, baby_3mo', () => {
    for (const t of ['metatah', 'wedding_metatah', 'baby_3mo']) {
      const list = types(t)
      expect(list).toContain('member')
      expect(list.indexOf('member')).toBe(list.indexOf('couple') + 1)
    }
  })
  it('does not seed member for wedding or birthday', () => {
    expect(types('wedding')).not.toContain('member')
    expect(types('birthday')).not.toContain('member')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/starter-sections.test.ts`
Expected: FAIL — `member` not present in those starters.

- [ ] **Step 3: Add `member` to the three starters**

In `server/registry/starter-sections.ts`:

Add a wedding_metatah-specific section list just below `WEDDING_SECTIONS` (line ~15) so plain `wedding` is unaffected:

```ts
const WEDDING_METATAH_SECTIONS: SectionType[] = ['hero', 'opening', 'couple', 'member', 'event', 'countdown', 'gallery', 'love_gift', 'quote', 'closing', 'footer']
```

Change the `wedding_metatah` entry's `sections:` from `WEDDING_SECTIONS` to `WEDDING_METATAH_SECTIONS`.

Change `metatah`'s `sections` array to:

```ts
    sections: ['hero', 'opening', 'couple', 'member', 'event', 'countdown', 'gallery', 'closing', 'footer'],
```

Change `baby_3mo`'s `sections` array to:

```ts
    sections: ['hero', 'opening', 'couple', 'member', 'event', 'gallery', 'closing', 'footer'],
```

(Leave `wedding` and `birthday` untouched.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/registry/starter-sections.test.ts`
Expected: PASS (new tests + all existing starter tests, since `wedding`/`birthday` composition is unchanged).

- [ ] **Step 5: Commit**

```bash
git add server/registry/starter-sections.ts tests/registry/starter-sections.test.ts
git commit -m "feat: seed member section after couple for metatah/wedding_metatah/baby_3mo"
```

---

### Task 4: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: all tests pass (prior 250 + member registry 3 + member component 6 + starter 2).

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck`
Expected: exit 0.

- [ ] **Step 3: Report**

Confirm MemberSection complete: `member` ("Peserta") section with a nested group→participants editor (reuses `ListControl`), base + elegant render with participants stacked, seeded after `couple` in metatah / wedding_metatah / baby_3mo. Hand back for the finish-branch decision.

---

## Self-Review Notes

- **Spec coverage:** §3 schema/registry → Task 1; §4 render → Task 2 (base + elegant); §5 register → Task 2; §6 starter seeding → Task 3; §7 testing → Tasks 1/2/3 + Task 4 gate. All covered.
- **Type consistency:** `Person = { name, instagram, photo: { mediaId, url } }` and `Member = { peoples, parents, childOrder }` are identical across the schema (Task 1), both components (Task 2), and the test fixtures. The registry `member.fields.members` is a `list` whose item has a nested `peoples` `list` — matches the nested-list capability confirmed in `FieldEditor`/`ListControl`.
- **theme-packs invariant:** adding `member` to base `sectionComponents` (Task 2 Step 5) forces the elegant pack entry (Step 6); both land in the same commit so the "elegant overrides every section" test never goes red.
- **No new field type/control:** nested list reuses `ListControl`; no `FieldType` union change.
- **Starter isolation:** `wedding_metatah` gets its own `WEDDING_METATAH_SECTIONS`; plain `wedding` keeps `WEDDING_SECTIONS` → `wedding`/`birthday` unchanged (asserted in Task 3 test).

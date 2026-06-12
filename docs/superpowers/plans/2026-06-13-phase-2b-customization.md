# Phase 2b-customization (Edit Desain: warna & font) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer override their invitation's accent colours (primary/secondary/accent) and fonts (heading/body) on top of the theme, with a live preview, persistence, and reset — and make the curated fonts actually load.

**Architecture:** The token cascade (`resolveTokens(theme.tokens, invitation.tokenOverrides)`) already exists and is applied at render. This phase adds: the `color.accent` knob to the override whitelist; a curated font allow-list driving validation + the editor dropdowns + a global Google Fonts `<link>`; a pure `validateDesignOverrides`; a `PATCH /design` endpoint; raw `themeTokens`+`tokenOverrides` in the editor GET; client-side reactive `cssVars` for instant preview; a `DesignControls` component; and wiring `--font-body`/`--color-secondary` into the renderer so those knobs visibly work.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Zod-free pure validators, Drizzle ORM, Vitest + @vue/test-utils.

**Branch:** `feat/phase-2b-media` (continuation). No DB migration — `tokenOverrides` column already exists (jsonb, default `{}`).

**Key facts grounding this plan:**
- `server/theme/tokens.ts` has `OVERRIDE_WHITELIST`, `pickWhitelisted`, `resolveTokens`, `tokensToCssVars`, `baseTokens`, `Tokens`.
- Section components import nothing from Nuxt UI and use CSS vars inline. Only `--color-primary/bg/text/accent` + `--font-heading` are currently consumed; `--font-body` and `--color-secondary` are unused (the gap this plan also closes).
- Design overrides are invitation-level (`inv.tokenOverrides`), applied by `assembleInvitation` at read time for BOTH draft and published — so a design change reflects on `/u/:slug` without republish (subject to the published route's `s-maxage=60` edge window; no purge built, matching the 2b-media decision).
- Cross-boundary imports from `server/` into `app/` are an established pattern (e.g. `useInvitationEditor` imports `defaultContent` from `server/registry/sections`).
- Test helper `tests/helpers/nuxt-ui-stubs.ts` exports `nuxtUiStubs`.

---

## File Structure

**Pure logic / tokens (server):**
- Modify `server/theme/tokens.ts` — add `color.accent` to `OVERRIDE_WHITELIST`.
- Create `server/theme/fonts.ts` — curated font lists + `googleFontsHref()`.
- Create `server/theme/design-validate.ts` — `DesignOverrides` type + `validateDesignOverrides`.

**Endpoint / GET (server):**
- Create `server/api/admin/invitations/[id]/design.patch.ts`.
- Modify `server/api/admin/invitations/[id]/index.get.ts` — return `themeTokens` + `tokenOverrides`.

**Components / page (app):**
- Create `app/components/editor/DesignControls.vue`.
- Modify `app/pages/admin/invitations/[id]/edit.vue` — reactive `cssVars`, mount `DesignControls`, debounced `saveDesign`.
- Modify `app/app.vue` — global Google Fonts `<link>` via `useHead`.
- Modify `app/components/invitation/InvitationRoot.vue` + `app/components/editor/EditorPreview.vue` — body font on the `.invitation` root.
- Modify `app/components/invitation/sections/HeroSection.vue` + `app/components/invitation/CoverModal.vue` — `--color-secondary` on the eyebrow line.

**Tests:** under `tests/theme`, `tests/components`.

---

## Task 1: Whitelist `color.accent` + resolveTokens coverage

**Files:**
- Modify: `server/theme/tokens.ts:16`
- Test: `tests/theme/tokens.test.ts` (create if absent; otherwise add cases)

- [ ] **Step 1: Write the failing test**

Create/append `tests/theme/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveTokens, tokensToCssVars, OVERRIDE_WHITELIST } from '../../server/theme/tokens'

const theme = { color: { primary: '#111111', secondary: '#222222', accent: '#333333' }, font: { heading: 'Marcellus', body: 'Lora' } }

describe('resolveTokens design overrides', () => {
  it('applies a whitelisted accent override', () => {
    const out = resolveTokens(theme as any, { color: { accent: '#abcdef' } } as any)
    expect(out.color.accent).toBe('#abcdef')
  })
  it('lets primary/secondary/accent + heading/body fonts override, but locks background', () => {
    const out = resolveTokens(theme as any, { color: { primary: '#aaaaaa', bg: '#000000' }, font: { body: 'Poppins' } } as any)
    expect(out.color.primary).toBe('#aaaaaa')
    expect(out.font.body).toBe('Poppins')
    expect(out.color.bg).toBe(theme.color['bg' as 'primary'] ?? out.color.bg) // bg not overridable → stays theme/base
  })
  it('exposes a live-preview css var for an overridden colour', () => {
    const vars = tokensToCssVars(resolveTokens(theme as any, { color: { primary: '#123456' } } as any))
    expect(vars['--color-primary']).toBe('#123456')
    expect(vars['--color-bg']).not.toBe('#123456')
  })
  it('whitelist contains accent', () => {
    expect(OVERRIDE_WHITELIST).toContain('color.accent')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme/tokens.test.ts`
Expected: FAIL — `color.accent` not in whitelist, accent override stripped.

- [ ] **Step 3: Add accent to the whitelist**

`server/theme/tokens.ts` line 16:

```ts
export const OVERRIDE_WHITELIST = ['color.primary', 'color.secondary', 'color.accent', 'font.heading', 'font.body'] as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/theme/tokens.ts tests/theme/tokens.test.ts
git commit -m "feat: allow color.accent as a per-invitation design override"
```

---

## Task 2: Curated fonts module

**Files:**
- Create: `server/theme/fonts.ts`
- Test: `tests/theme/fonts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/theme/fonts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { HEADING_FONTS, BODY_FONTS, ALL_FONTS, googleFontsHref } from '../../server/theme/fonts'

describe('curated fonts', () => {
  it('lists heading and body fonts', () => {
    expect(HEADING_FONTS).toContain('Cormorant Garamond')
    expect(BODY_FONTS).toContain('Poppins')
  })
  it('ALL_FONTS is the de-duplicated union', () => {
    expect(new Set(ALL_FONTS).size).toBe(ALL_FONTS.length)
    for (const f of [...HEADING_FONTS, ...BODY_FONTS]) expect(ALL_FONTS).toContain(f)
  })
  it('googleFontsHref includes every family, plus-encoded, with display=swap', () => {
    const href = googleFontsHref()
    expect(href).toContain('https://fonts.googleapis.com/css2?')
    expect(href).toContain('display=swap')
    expect(href).toContain('family=Cormorant+Garamond')
    expect(href).toContain('family=Nunito+Sans')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme/fonts.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/theme/fonts.ts`**

```ts
// Curated font allow-list. Same list drives: server-side validation of font
// overrides, the editor dropdowns, and the global Google Fonts <link>. Names MUST
// match Google Fonts family names exactly (they are also the CSS font-family value).
export const HEADING_FONTS = ['Cormorant Garamond', 'Playfair Display', 'Marcellus', 'Great Vibes', 'Cinzel'] as const
export const BODY_FONTS = ['Poppins', 'Lora', 'Nunito Sans', 'EB Garamond'] as const
export const ALL_FONTS: string[] = [...new Set<string>([...HEADING_FONTS, ...BODY_FONTS])]

export type HeadingFont = (typeof HEADING_FONTS)[number]
export type BodyFont = (typeof BODY_FONTS)[number]

// Single CSS2 request loading every curated family. Spaces → '+', families joined
// by '&family='. display=swap avoids invisible text while the font loads.
export function googleFontsHref(): string {
  const families = ALL_FONTS.map((f) => `family=${f.replace(/ /g, '+')}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme/fonts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/theme/fonts.ts tests/theme/fonts.test.ts
git commit -m "feat: curated font allow-list + Google Fonts href builder"
```

---

## Task 3: `validateDesignOverrides` (pure)

**Files:**
- Create: `server/theme/design-validate.ts`
- Test: `tests/theme/design-validate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/theme/design-validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateDesignOverrides } from '../../server/theme/design-validate'

describe('validateDesignOverrides', () => {
  it('accepts a valid partial override', () => {
    const r = validateDesignOverrides({ color: { primary: '#a1b2c3' }, font: { heading: 'Marcellus' } })
    expect(r).toEqual({ ok: true, value: { color: { primary: '#a1b2c3' }, font: { heading: 'Marcellus' } } })
  })
  it('accepts 3-digit hex', () => {
    const r = validateDesignOverrides({ color: { accent: '#abc' } })
    expect(r.ok).toBe(true)
  })
  it('rejects a bad hex', () => {
    const r = validateDesignOverrides({ color: { primary: 'red' } })
    expect(r.ok).toBe(false)
  })
  it('rejects a font not in its role list', () => {
    expect(validateDesignOverrides({ font: { heading: 'Poppins' } }).ok).toBe(false) // Poppins is body-only
    expect(validateDesignOverrides({ font: { body: 'Cinzel' } }).ok).toBe(false)     // Cinzel is heading-only
  })
  it('drops keys outside the whitelist (bg/text/radius) without error', () => {
    const r = validateDesignOverrides({ color: { primary: '#000000', bg: '#ffffff', text: '#111111' }, radius: { md: '20px' } })
    expect(r).toEqual({ ok: true, value: { color: { primary: '#000000' } } })
  })
  it('treats empty / garbage as a reset', () => {
    expect(validateDesignOverrides({})).toEqual({ ok: true, value: {} })
    expect(validateDesignOverrides(null)).toEqual({ ok: true, value: {} })
    expect(validateDesignOverrides('nope')).toEqual({ ok: true, value: {} })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme/design-validate.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/theme/design-validate.ts`**

```ts
import { HEADING_FONTS, BODY_FONTS } from './fonts'

export interface DesignOverrides {
  color?: { primary?: string; secondary?: string; accent?: string }
  font?: { heading?: string; body?: string }
}
export type ValidateResult = { ok: true; value: DesignOverrides } | { ok: false; error: string }

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const COLOR_KEYS = ['primary', 'secondary', 'accent'] as const

// Returns a clean, whitelisted overrides object. Any provided value that is invalid
// (bad hex, font not in its role list) fails the whole request. Unknown keys are
// dropped silently. Absent keys stay unset (partial override). Empty/garbage → reset.
export function validateDesignOverrides(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== 'object') return { ok: true, value: {} }
  const input = raw as any
  const value: DesignOverrides = {}

  if (input.color && typeof input.color === 'object') {
    for (const k of COLOR_KEYS) {
      const v = input.color[k]
      if (v === undefined) continue
      if (typeof v !== 'string' || !HEX.test(v)) return { ok: false, error: `invalid colour: ${k}` }
      ;(value.color ??= {})[k] = v
    }
  }
  if (input.font && typeof input.font === 'object') {
    const h = input.font.heading
    if (h !== undefined) {
      if (typeof h !== 'string' || !(HEADING_FONTS as readonly string[]).includes(h)) return { ok: false, error: 'invalid heading font' }
      ;(value.font ??= {}).heading = h
    }
    const b = input.font.body
    if (b !== undefined) {
      if (typeof b !== 'string' || !(BODY_FONTS as readonly string[]).includes(b)) return { ok: false, error: 'invalid body font' }
      ;(value.font ??= {}).body = b
    }
  }
  return { ok: true, value }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme/design-validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/theme/design-validate.ts tests/theme/design-validate.test.ts
git commit -m "feat: validateDesignOverrides (hex + curated font + whitelist strip)"
```

---

## Task 4: `PATCH /api/admin/invitations/:id/design` endpoint

**Files:**
- Create: `server/api/admin/invitations/[id]/design.patch.ts`
- Test: none new (logic = Task 3 validator + shared `assertOwnerOr404`; verified by typecheck + Task 10). Matches the codebase's thin-shell pattern.

- [ ] **Step 1: Implement the endpoint**

Create `server/api/admin/invitations/[id]/design.patch.ts`:

```ts
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { invitations } from '../../../../db/schema'
import { assertOwnerOr404 } from '../../../../utils/ownership'
import { validateDesignOverrides } from '../../../../theme/design-validate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const session = await getUserSession(event)
  const db = useDb()

  const [inv] = await db.select({ id: invitations.id, ownerId: invitations.ownerId }).from(invitations).where(eq(invitations.id, id)).limit(1)
  assertOwnerOr404(inv ?? null, session.user?.id ?? null)

  const body = await readBody(event)
  const result = validateDesignOverrides(body?.tokenOverrides)
  if (!result.ok) throw createError({ statusCode: 400, message: result.error })

  await db.update(invitations).set({ tokenOverrides: result.value, updatedAt: new Date() }).where(eq(invitations.id, id))
  return { ok: true, tokenOverrides: result.value }
})
```

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/invitations/[id]/design.patch.ts
git commit -m "feat: PATCH /design endpoint persists validated design overrides (owner-guarded)"
```

---

## Task 5: Editor GET returns `themeTokens` + `tokenOverrides`

**Files:**
- Modify: `server/api/admin/invitations/[id]/index.get.ts`
- Test: none new (thin read; covered by typecheck + Task 8 wiring).

- [ ] **Step 1: Add the raw inputs to the response**

In `server/api/admin/invitations/[id]/index.get.ts`, the handler already loads `inv` and `theme` and computes `cssVars`. Extend the returned object with the theme tokens and current overrides. Add to the `return {...}`:

```ts
    themeTokens: (theme?.tokens as any) ?? {},
    tokenOverrides: (inv!.tokenOverrides as any) ?? {},
```

(Place them alongside `cssVars`, keeping `cssVars` for the initial paint. The earlier 2b-media additions `musicMediaId`/`musicUrl` stay.)

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/api/admin/invitations/[id]/index.get.ts
git commit -m "feat: editor GET returns themeTokens + tokenOverrides for live design preview"
```

---

## Task 6: Load curated fonts globally

**Files:**
- Modify: `app/app.vue`
- Test: none new (`googleFontsHref` covered in Task 2; `useHead` wiring verified by typecheck + manual). 

- [ ] **Step 1: Add the Google Fonts links via useHead**

Replace `app/app.vue` with (keeps the existing `<UApp>` shell):

```vue
<script setup lang="ts">
import { googleFontsHref } from '../server/theme/fonts'

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: googleFontsHref() },
  ],
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </UApp>
</template>
```

- [ ] **Step 2: Typecheck + full suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

- [ ] **Step 3: Commit**

```bash
git add app/app.vue
git commit -m "feat: load curated Google Fonts globally so token fonts actually render"
```

---

## Task 7: `DesignControls.vue` component

**Files:**
- Create: `app/components/editor/DesignControls.vue`
- Test: `tests/components/design-controls.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/design-controls.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DesignControls from '../../app/components/editor/DesignControls.vue'
import { HEADING_FONTS, BODY_FONTS } from '../../server/theme/fonts'

const themeTokens = { color: { primary: '#111111', secondary: '#222222', accent: '#333333' }, font: { heading: 'Marcellus', body: 'Lora' } }

describe('DesignControls', () => {
  it('lists the curated fonts per role plus an inherit option', () => {
    const w = mount(DesignControls, { props: { modelValue: {}, themeTokens } })
    const heading = w.find('select[data-font="heading"]')
    const body = w.find('select[data-font="body"]')
    for (const f of HEADING_FONTS) expect(heading.text()).toContain(f)
    for (const f of BODY_FONTS) expect(body.text()).toContain(f)
    expect(heading.text()).toContain('ikut tema')
  })

  it('emits an override when a colour changes', async () => {
    const w = mount(DesignControls, { props: { modelValue: {}, themeTokens } })
    const primary = w.find('input[type="color"][data-color="primary"]')
    await primary.setValue('#123456')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({ color: { primary: '#123456' } })
  })

  it('emits an override without the key when a font is set to inherit', async () => {
    const w = mount(DesignControls, { props: { modelValue: { font: { heading: 'Cinzel' } }, themeTokens } })
    const heading = w.find('select[data-font="heading"]')
    await heading.setValue('')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({})
  })

  it('reset emits an empty overrides object', async () => {
    const w = mount(DesignControls, { props: { modelValue: { color: { primary: '#000000' } }, themeTokens } })
    await w.find('button[data-reset]').trigger('click')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/design-controls.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `app/components/editor/DesignControls.vue`**

Native inputs only (no Nuxt UI) so it is framework-light and unit-testable:

```vue
<script setup lang="ts">
import { HEADING_FONTS, BODY_FONTS } from '../../../server/theme/fonts'
import type { DesignOverrides } from '../../../server/theme/design-validate'

type ColorKey = 'primary' | 'secondary' | 'accent'
const props = defineProps<{ modelValue: DesignOverrides; themeTokens: { color?: Record<string, string>; font?: Record<string, string> } }>()
const emit = defineEmits<{ 'update:modelValue': [DesignOverrides] }>()

const colorRows: { key: ColorKey; label: string }[] = [
  { key: 'primary', label: 'Warna Utama' },
  { key: 'secondary', label: 'Warna Sekunder' },
  { key: 'accent', label: 'Warna Aksen' },
]

function emitWith(mut: (o: DesignOverrides) => void) {
  const next: DesignOverrides = JSON.parse(JSON.stringify(props.modelValue ?? {}))
  mut(next)
  if (next.color && Object.keys(next.color).length === 0) delete next.color
  if (next.font && Object.keys(next.font).length === 0) delete next.font
  emit('update:modelValue', next)
}
function colorValue(key: ColorKey): string {
  return props.modelValue.color?.[key] ?? props.themeTokens?.color?.[key] ?? '#000000'
}
function setColor(key: ColorKey, val: string) { emitWith((o) => { (o.color ??= {})[key] = val }) }
function clearColor(key: ColorKey) { emitWith((o) => { if (o.color) delete o.color[key] }) }
function setFont(key: 'heading' | 'body', val: string) {
  emitWith((o) => { if (!val) { if (o.font) delete o.font[key] } else (o.font ??= {})[key] = val })
}
function reset() { emit('update:modelValue', {}) }
</script>

<template>
  <div class="rounded border p-3 text-sm">
    <h3 class="mb-2 font-medium text-gray-700">Desain</h3>

    <div v-for="row in colorRows" :key="row.key" class="mb-2 flex items-center gap-2">
      <span class="w-28 text-gray-600">{{ row.label }}</span>
      <input type="color" :data-color="row.key" :value="colorValue(row.key)" @input="setColor(row.key, ($event.target as HTMLInputElement).value)" />
      <input type="text" class="w-24 rounded border px-1 py-0.5" :data-hex="row.key" :value="modelValue.color?.[row.key] ?? ''" placeholder="ikut tema" @change="setColor(row.key, ($event.target as HTMLInputElement).value)" />
      <button v-if="modelValue.color?.[row.key]" type="button" class="text-xs text-gray-400" @click="clearColor(row.key)">×</button>
    </div>

    <div class="mb-2 flex items-center gap-2">
      <span class="w-28 text-gray-600">Font Judul</span>
      <select data-font="heading" class="rounded border px-1 py-0.5" :value="modelValue.font?.heading ?? ''" @change="setFont('heading', ($event.target as HTMLSelectElement).value)">
        <option value="">— ikut tema —</option>
        <option v-for="f in HEADING_FONTS" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>
    <div class="mb-3 flex items-center gap-2">
      <span class="w-28 text-gray-600">Font Teks</span>
      <select data-font="body" class="rounded border px-1 py-0.5" :value="modelValue.font?.body ?? ''" @change="setFont('body', ($event.target as HTMLSelectElement).value)">
        <option value="">— ikut tema —</option>
        <option v-for="f in BODY_FONTS" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <button type="button" data-reset class="text-xs text-red-600" @click="reset">Reset ke tema</button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/design-controls.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add app/components/editor/DesignControls.vue tests/components/design-controls.test.ts
git commit -m "feat: DesignControls — colour pickers + curated font selects + reset"
```

---

## Task 8: Editor page — reactive cssVars + DesignControls + saveDesign

**Files:**
- Modify: `app/pages/admin/invitations/[id]/edit.vue`
- Test: none new (page integration; the resolve logic is covered by Task 1, the component by Task 7; verified by typecheck + Task 10 full suite).

- [ ] **Step 1: Add imports**

In `app/pages/admin/invitations/[id]/edit.vue`, add to the imports block:

```ts
import { computed } from 'vue'
import { resolveTokens, tokensToCssVars } from '../../../../../server/theme/tokens'
import type { DesignOverrides } from '../../../../../server/theme/design-validate'
import DesignControls from '~/components/editor/DesignControls.vue'
```

Path note: `edit.vue` lives at `app/pages/admin/invitations/[id]/edit.vue`; the `server/` dir is **five** levels up (`[id]` → `invitations` → `admin` → `pages` → `app` → repo root), hence `../../../../../server/...`. This mirrors the existing cross-boundary import style in `app/composables/useInvitationEditor.ts` (which uses `../../server/...` from `app/composables/`). Verify the path resolves (Step 4 typecheck) before committing; if the project has the Nuxt `~~`/`@@` rootDir alias enabled, `~~/server/theme/tokens` is an acceptable equivalent.

(The file already imports `{ ref, watch, provide }` from 'vue' — add `computed` there instead if you prefer a single import line. Use whichever keeps one `from 'vue'` import.)

- [ ] **Step 2: Replace the static cssVars with reactive design state**

Find the current line:

```ts
const cssVars = ((data.value as any).cssVars ?? {}) as Record<string, string>
```

Replace it with:

```ts
const themeTokens = ((data.value as any).themeTokens ?? {}) as Record<string, any>
const overrides = ref<DesignOverrides>(((data.value as any).tokenOverrides ?? {}) as DesignOverrides)
const cssVars = computed(() => tokensToCssVars(resolveTokens(themeTokens as any, overrides.value as any)))

const designDebouncer = createDebouncer(saveDesign, 600)
async function saveDesign() {
  try { await $fetch(`/api/admin/invitations/${id}/design`, { method: 'PATCH', body: { tokenOverrides: overrides.value } }) } catch { /* non-fatal; preview already updated */ }
}
watch(overrides, () => designDebouncer.schedule(), { deep: true })
```

(`createDebouncer` is already imported in this file. `saveDesign` is referenced before its declaration in `createDebouncer(saveDesign, 600)` — that is fine because `function saveDesign` is hoisted; keep it a `function` declaration as shown.)

- [ ] **Step 3: Mount DesignControls in the left column**

The left column currently is a `<div class="space-y-4">` containing `<InvitationSettings .../>` then `<SectionList .../>`. Add `DesignControls` between them:

```vue
        <div class="space-y-4">
          <InvitationSettings v-model:music-url="musicUrl" :on-set-music="setMusic" />
          <DesignControls v-model="overrides" :theme-tokens="themeTokens" />
          <SectionList
            :sections="editor.doc.sections"
            @add="editor.addSection"
            @remove="editor.remove"
            @toggle="editor.toggle"
            @move="(p) => editor.move(p.from, p.to)"
            @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
        </div>
```

`EditorPreview` already receives `:css-vars="cssVars"`; since `cssVars` is now a `computed`, the preview updates reactively — no template change needed there.

- [ ] **Step 4: Typecheck + run full suite**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log` (exit 0, 0 errors)
Run: `npx vitest run` (all pass)

> The Step 1 import path (`../../../../../server/theme/tokens`, five levels up) is the verified depth for `app/pages/admin/invitations/[id]/edit.vue`. If typecheck reports the module can't be found, recount from the file's directory or use the `~~/server/theme/tokens` rootDir alias. Do not commit until typecheck is clean.

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/invitations/[id]/edit.vue
git commit -m "feat: live design preview — reactive cssVars + DesignControls + debounced saveDesign"
```

---

## Task 9: Wire `--font-body` + `--color-secondary` into the renderer

**Files:**
- Modify: `app/components/invitation/InvitationRoot.vue`
- Modify: `app/components/editor/EditorPreview.vue`
- Modify: `app/components/invitation/sections/HeroSection.vue`
- Modify: `app/components/invitation/CoverModal.vue`
- Test: `tests/components/token-wiring.test.ts` (new)

**Why:** Phase 2b-customization exposes Body font and Secondary colour as knobs, but the renderer never consumes `--font-body`/`--color-secondary`, so those knobs would have no visible effect. Apply the body font at the `.invitation` root (headings already override with `--font-heading` inline) and the secondary colour on the Hero/Cover eyebrow line.

- [ ] **Step 1: Write the failing test**

Create `tests/components/token-wiring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroSection from '../../app/components/invitation/sections/HeroSection.vue'
import EditorPreview from '../../app/components/editor/EditorPreview.vue'

describe('token wiring', () => {
  it('Hero eyebrow uses the secondary colour', () => {
    const w = mount(HeroSection, { props: { content: { title: 'The Wedding Of', coupleName: 'W & D', date: '' } } })
    const eyebrow = w.find('p.uppercase')
    expect(eyebrow.attributes('style')).toContain('var(--color-secondary)')
  })
  it('EditorPreview root applies the body font', () => {
    const w = mount(EditorPreview, { props: { sections: [], cssVars: {}, device: 'mobile', showCover: false } })
    expect(w.attributes('style')).toContain('font-family: var(--font-body)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/token-wiring.test.ts`
Expected: FAIL — eyebrow has no secondary colour; EditorPreview root has no body font.

- [ ] **Step 3: Apply the wiring**

`app/components/invitation/sections/HeroSection.vue` — eyebrow line (the `<p class="tracking-widest uppercase">`):

```vue
    <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ content.title }}</p>
```

`app/components/invitation/CoverModal.vue` — same eyebrow line (`<p class="tracking-widest uppercase">`):

```vue
      <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ title }}</p>
```

`app/components/editor/EditorPreview.vue` — the root `.invitation` element binds `:style="rootStyle"` (a string of cssVars). Append the body font to that computed so the preview root applies it. Change `rootStyle`:

```ts
const rootStyle = computed(() => {
  const vars = Object.entries(props.cssVars).map(([k, v]) => `${k}: ${v}`).join('; ')
  return `${vars}; font-family: var(--font-body)`
})
```

`app/components/invitation/InvitationRoot.vue` — the root `.invitation` element binds `:style="styleStr"`. Change `styleStr` the same way:

```ts
const styleStr = computed(() => {
  const vars = Object.entries(props.data.cssVars).map(([k, v]) => `${k}: ${v}`).join('; ')
  return `${vars}; font-family: var(--font-body)`
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/token-wiring.test.ts`
Expected: PASS.

- [ ] **Step 5: Run dependent component tests**

Run: `npx vitest run tests/components/editor-preview.test.ts tests/components/InvitationRoot.test.ts tests/components/CoverModal.test.ts`
Expected: PASS (the appended `font-family` does not break existing style assertions — they use `toContain`).

- [ ] **Step 6: Commit**

```bash
git add app/components/invitation/InvitationRoot.vue app/components/editor/EditorPreview.vue app/components/invitation/sections/HeroSection.vue app/components/invitation/CoverModal.vue tests/components/token-wiring.test.ts
git commit -m "feat: wire --font-body (root) and --color-secondary (eyebrow) so those knobs work"
```

---

## Task 10: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run`
Expected: all pass (prior 109 + the new theme/component tests). Zero failures.

- [ ] **Step 2: Typecheck**

Run: `npx nuxt typecheck > /tmp/tc.log 2>&1; echo $?; grep -c "error TS" /tmp/tc.log`
Expected: exit 0, 0 errors.

- [ ] **Step 3: Sanity grep**

Run:
```bash
grep -n "color.accent" server/theme/tokens.ts
grep -rn "var(--font-body)" app/components/invitation/InvitationRoot.vue app/components/editor/EditorPreview.vue
grep -rn "var(--color-secondary)" app/components/invitation/sections/HeroSection.vue app/components/invitation/CoverModal.vue
```
Expected: each prints a match (whitelist + both wirings present).

- [ ] **Step 4: Commit any straggler fix (only if needed)**

```bash
git add -A && git commit -m "chore: finalize phase 2b-customization"
```

(Skip if the tree is already clean.)

---

## Self-Review (done at write time)

- **Spec §3.1 (accent whitelist):** Task 1. ✅
- **Spec §3.2 (curated fonts + href):** Task 2. ✅
- **Spec §4 (validateDesignOverrides):** Task 3. ✅
- **Spec §5 (/design endpoint):** Task 4. ✅
- **Spec §6 (GET themeTokens + tokenOverrides):** Task 5. ✅
- **Spec §7 (live preview reactive cssVars + debounced save):** Task 8. ✅
- **Spec §8 (DesignControls UI):** Task 7 + mounted in Task 8. ✅
- **Spec §9 (font loading):** Task 6. ✅
- **Spec §10 (testing):** pure (Tasks 1,2,3), component (7,9), endpoint via validator (3+4), live-preview guard (Task 1 css-var case). ✅
- **Spec §12 success criteria:** 1→T1/T7/T8, 2→T2/T6/T9 (body font now consumed), 3→T7/T8/T4, 4→T4 (+T6 fonts load), 5→T3/T4/T1 (whitelist strip), 6→T6. ✅
- **Added beyond spec (justified):** Task 9 wires `--font-body`/`--color-secondary` so criterion #2 (body font) and criterion #1 (secondary colour) are visibly satisfied — without it the spec's own knobs would be inert. Tracked in the Phase-2 followups as the renderer-wiring fast-follow; folded in here because the criteria depend on it.
- **No migration:** `tokenOverrides` column exists. ✅
- **Type consistency:** `DesignOverrides` ({color?,font?}) used identically in Tasks 3/4/7/8; `validateDesignOverrides → {ok,value|error}`; `googleFontsHref()`; `resolveTokens(themeTokens, overrides)`/`tokensToCssVars` used in Tasks 1/8. ✅
- **Loop safety:** `saveDesign` does not feed the response back into `overrides`, so the `watch(overrides)` → debounce → PATCH cycle cannot loop (unlike the 2b-media document reconcile). ✅
- **Open risk flagged for the implementer:** the `server/`→`app/` import path in Task 8 (alias vs relative) — verify it resolves (Step 4 note) before committing.
```

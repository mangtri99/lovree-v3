import { HEADING_FONTS, BODY_FONTS } from './fonts'
import type { Tokens } from './tokens'

export const PACK_KEYS = [
  { value: 'base', label: 'Standar' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'dark_prada', label: 'Dark Prada' },
  { value: 'maroon', label: 'Marun Klasik' },
] as const

export interface ThemeInput { name: string; key: string; tokens: any }
export type ThemeValidation =
  | { ok: true; value: { name: string; key: string; tokens: Tokens } }
  | { ok: false; error: string }

const HEX = /^#[0-9a-fA-F]{6}$/
const PX = /^\d+px$/
const KEYS = PACK_KEYS.map((p) => p.value) as readonly string[]
const DIVIDERS = ['none', 'line', 'flourish']
const MOTIFS = ['none', 'corners']

export function validateThemeInput(input: ThemeInput): ThemeValidation {
  const name = (input?.name ?? '').trim()
  if (!name) return { ok: false, error: 'Nama wajib diisi' }
  if (!KEYS.includes(input?.key)) return { ok: false, error: 'Layout tidak valid' }
  const t = input?.tokens
  if (!t || typeof t !== 'object') return { ok: false, error: 'Token tidak valid' }

  for (const k of ['primary', 'secondary', 'bg', 'text', 'accent'] as const) {
    if (!HEX.test(t.color?.[k] ?? '')) return { ok: false, error: `Warna ${k} tidak valid` }
  }
  if (!(HEADING_FONTS as readonly string[]).includes(t.font?.heading)) return { ok: false, error: 'Font heading tidak valid' }
  if (!(BODY_FONTS as readonly string[]).includes(t.font?.body)) return { ok: false, error: 'Font body tidak valid' }
  for (const k of ['sm', 'md', 'lg'] as const) {
    if (!PX.test(t.radius?.[k] ?? '')) return { ok: false, error: `Radius ${k} harus dalam px` }
  }
  if (!DIVIDERS.includes(t.ornament?.divider)) return { ok: false, error: 'Divider tidak valid' }
  if (!MOTIFS.includes(t.ornament?.motif)) return { ok: false, error: 'Motif tidak valid' }

  const tokens: Tokens = {
    color: { primary: t.color.primary, secondary: t.color.secondary, bg: t.color.bg, text: t.color.text, accent: t.color.accent },
    font: { heading: t.font.heading, body: t.font.body },
    radius: { sm: t.radius.sm, md: t.radius.md, lg: t.radius.lg },
    ornament: { divider: t.ornament.divider, motif: t.ornament.motif },
  }
  return { ok: true, value: { name, key: input.key, tokens } }
}

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
// dropped silently. Absent keys stay unset (partial override). Empty/garbage -> reset.
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

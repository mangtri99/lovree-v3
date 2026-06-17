import { describe, it, expect } from 'vitest'
import { validateThemeInput, PACK_KEYS } from '../../server/theme/validate-theme'

const goodTokens = {
  color: { primary: '#7a1f2b', secondary: '#9c6b6b', bg: '#fbf6ee', text: '#3a2326', accent: '#c0962f' },
  font: { heading: 'Cinzel', body: 'Lora' },
  radius: { sm: '4px', md: '6px', lg: '8px' },
  ornament: { divider: 'line', motif: 'corners' },
}
const good = { name: 'Tema Saya', key: 'maroon', tokens: goodTokens }

describe('validateThemeInput', () => {
  it('accepts a complete valid theme and normalizes', () => {
    const r = validateThemeInput({ ...good, name: '  Tema Saya  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('Tema Saya')
      expect(r.value.key).toBe('maroon')
      expect(r.value.tokens.color.primary).toBe('#7a1f2b')
    }
  })
  it('rejects empty name', () => {
    expect(validateThemeInput({ ...good, name: '   ' }).ok).toBe(false)
  })
  it('rejects an unknown pack key', () => {
    expect(validateThemeInput({ ...good, key: 'nope' }).ok).toBe(false)
  })
  it('rejects a non-hex colour', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, color: { ...goodTokens.color, primary: 'red' } } }).ok).toBe(false)
  })
  it('rejects a font outside the allow-list', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, font: { heading: 'Comic Sans', body: 'Lora' } } }).ok).toBe(false)
  })
  it('rejects a non-px radius', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, radius: { sm: '4', md: '6px', lg: '8px' } } }).ok).toBe(false)
  })
  it('rejects an out-of-enum divider/motif', () => {
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, ornament: { divider: 'zigzag', motif: 'none' } } }).ok).toBe(false)
    expect(validateThemeInput({ ...good, tokens: { ...goodTokens, ornament: { divider: 'none', motif: 'stars' } } }).ok).toBe(false)
  })
  it('PACK_KEYS lists the four layouts', () => {
    expect(PACK_KEYS.map((p) => p.value)).toEqual(['base', 'elegant', 'dark_prada', 'maroon'])
  })
})

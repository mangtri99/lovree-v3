import { describe, it, expect } from 'vitest'
import { resolveTokens, tokensToCssVars, OVERRIDE_WHITELIST } from '../../server/theme/tokens'

const theme = { color: { primary: '#111111', secondary: '#222222', accent: '#333333' }, font: { heading: 'Marcellus', body: 'Lora' } }

describe('resolveTokens design overrides', () => {
  it('applies a whitelisted accent override', () => {
    const out = resolveTokens(theme as any, { color: { accent: '#abcdef' } } as any)
    expect(out.color.accent).toBe('#abcdef')
  })
  it('lets primary override but locks background', () => {
    const out = resolveTokens(theme as any, { color: { primary: '#aaaaaa', bg: '#000000' }, font: { body: 'Poppins' } } as any)
    expect(out.color.primary).toBe('#aaaaaa')
    expect(out.font.body).toBe('Poppins')
    expect(out.color.bg).not.toBe('#000000') // bg not overridable
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

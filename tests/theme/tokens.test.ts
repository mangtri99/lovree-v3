import { describe, it, expect } from 'vitest'
import { baseTokens, resolveTokens, tokensToCssVars, OVERRIDE_WHITELIST } from '../../server/theme/tokens'

describe('tokens', () => {
  it('theme overrides base, invitation overrides theme', () => {
    const theme = { color: { primary: '#8b5e3c' } }
    const overrides = { color: { primary: '#111111' }, font: { heading: 'Cormorant' } }
    const r = resolveTokens(theme, overrides)
    expect(r.color.primary).toBe('#111111')      // invitation wins
    expect(r.font.heading).toBe('Cormorant')      // invitation adds
    expect(r.color.bg).toBe(baseTokens.color.bg)  // base fallback
  })

  it('drops non-whitelisted invitation overrides', () => {
    const r = resolveTokens({}, { radius: { sm: '999px' } as any })
    expect(r.radius.sm).toBe(baseTokens.radius.sm)
    expect(OVERRIDE_WHITELIST).not.toContain('radius.sm')
  })

  it('flattens tokens to css custom properties', () => {
    const vars = tokensToCssVars(resolveTokens({ color: { primary: '#abc' } }, {}))
    expect(vars['--color-primary']).toBe('#abc')
    expect(vars['--font-heading']).toBeDefined()
  })
})

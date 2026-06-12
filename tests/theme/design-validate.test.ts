import { describe, it, expect } from 'vitest'
import { validateDesignOverrides } from '../../server/theme/design-validate'

describe('validateDesignOverrides', () => {
  it('accepts a valid partial override', () => {
    const r = validateDesignOverrides({ color: { primary: '#a1b2c3' }, font: { heading: 'Marcellus' } })
    expect(r).toEqual({ ok: true, value: { color: { primary: '#a1b2c3' }, font: { heading: 'Marcellus' } } })
  })
  it('accepts 3-digit hex', () => {
    expect(validateDesignOverrides({ color: { accent: '#abc' } }).ok).toBe(true)
  })
  it('rejects a bad hex', () => {
    expect(validateDesignOverrides({ color: { primary: 'red' } }).ok).toBe(false)
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

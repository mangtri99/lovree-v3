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

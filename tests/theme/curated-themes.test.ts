import { describe, it, expect } from 'vitest'
import { CURATED_THEMES } from '../../server/theme/curated-themes'
import { HEADING_FONTS, BODY_FONTS } from '../../server/theme/fonts'

const HEX = /^#[0-9a-f]{6}$/i

describe('CURATED_THEMES', () => {
  it('has at least 5 themes with unique names', () => {
    expect(CURATED_THEMES.length).toBeGreaterThanOrEqual(5)
    const names = CURATED_THEMES.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('every theme has 5 valid hex colours and allow-listed fonts', () => {
    for (const t of CURATED_THEMES) {
      for (const k of ['primary', 'secondary', 'bg', 'text', 'accent'] as const) {
        expect(HEX.test(t.tokens.color[k]), `${t.name}.${k}=${t.tokens.color[k]}`).toBe(true)
      }
      expect(HEADING_FONTS as readonly string[]).toContain(t.tokens.font.heading)
      expect(BODY_FONTS as readonly string[]).toContain(t.tokens.font.body)
    }
  })
  it('the first theme is Radiant Love (the default/demo theme)', () => {
    expect(CURATED_THEMES[0].name).toBe('Radiant Love')
  })
  it('includes Dark Prada with the dark_prada pack key', () => {
    const t = CURATED_THEMES.find((x) => x.name === 'Dark Prada')
    expect(t).toBeTruthy()
    expect(t!.key).toBe('dark_prada')
    expect(t!.tokens.color.bg).toBe('#1b1a17')
  })
})

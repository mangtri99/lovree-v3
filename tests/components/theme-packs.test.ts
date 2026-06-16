import { describe, it, expect } from 'vitest'
import { resolveSectionComponent } from '../../app/components/invitation/themePacks'
import HeroSection from '../../app/components/invitation/sections/HeroSection.vue'
import FooterSection from '../../app/components/invitation/sections/FooterSection.vue'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'
import { sectionComponents } from '../../app/components/invitation/sectionComponents'

describe('resolveSectionComponent', () => {
  it('returns the theme pack component when the theme overrides the section', () => {
    expect(resolveSectionComponent('elegant', 'hero')).toBe(ElegantHero)
  })
  it('falls back to the base component for an unknown theme key', () => {
    expect(resolveSectionComponent('nope', 'footer')).toBe(FooterSection)
  })
  it('uses base for the base theme', () => {
    expect(resolveSectionComponent('base', 'hero')).toBe(HeroSection)
  })
  it('returns null for an unknown section type', () => {
    expect(resolveSectionComponent('elegant', 'nope')).toBe(null)
  })
  it('elegant overrides every section type (no base fallback for known types)', () => {
    for (const type of Object.keys(sectionComponents)) {
      expect(resolveSectionComponent('elegant', type)).not.toBe(sectionComponents[type])
    }
  })
  it('dark_prada overrides every section type (full pack)', () => {
    for (const type of Object.keys(sectionComponents)) {
      const c = resolveSectionComponent('dark_prada', type)
      expect(c, `dark_prada missing ${type}`).toBeTruthy()
      expect(c).not.toBe(sectionComponents[type])
    }
  })
})

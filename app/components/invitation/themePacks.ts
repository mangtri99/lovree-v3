import { sectionComponents as base } from './sectionComponents'
import ElegantHero from './themes/elegant/HeroSection.vue'
import ElegantCouple from './themes/elegant/CoupleSection.vue'

// themeKey -> (sectionType -> component). A theme overrides only the sections that
// differ; everything else falls back to the shared `base` pack.
const packs: Record<string, Record<string, any>> = {
  elegant: { hero: ElegantHero, couple: ElegantCouple },
}

export function resolveSectionComponent(themeKey: string, type: string): any | null {
  return packs[themeKey]?.[type] ?? base[type] ?? null
}

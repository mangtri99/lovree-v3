// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseHero from '../../app/components/invitation/sections/HeroSection.vue'
import BaseSlide from '../../app/components/invitation/sections/HeroSlideshowSection.vue'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'
import ElegantSlide from '../../app/components/invitation/themes/elegant/HeroSlideshowSection.vue'
import DarkHero from '../../app/components/invitation/themes/dark_prada/HeroSection.vue'
import DarkSlide from '../../app/components/invitation/themes/dark_prada/HeroSlideshowSection.vue'
import MaroonHero from '../../app/components/invitation/themes/maroon/HeroSection.vue'
import MaroonSlide from '../../app/components/invitation/themes/maroon/HeroSlideshowSection.vue'

const hero = { title: 'T', coupleName: 'A & B', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', backgroundImage: { mediaId: '', url: '' } }
const heroBg = { ...hero, backgroundImage: { mediaId: 'm', url: 'https://cdn/x.jpg' } }
const slide = { title: 'T', coupleName: 'A & B', date: '', dateFormat: 'DD MMMM YYYY', images: [] }

const heroes = [['baseHero', BaseHero], ['elegantHero', ElegantHero], ['darkHero', DarkHero], ['maroonHero', MaroonHero]] as const
const slides = [['baseSlide', BaseSlide], ['elegantSlide', ElegantSlide], ['darkSlide', DarkSlide], ['maroonSlide', MaroonSlide]] as const

describe('hero sections are full screen', () => {
  for (const [name, Comp] of heroes) {
    it(`${name} solid variant is min-h-screen`, () => {
      const w = mount(Comp, { props: { content: hero } })
      expect(w.find('section').classes()).toContain('min-h-screen')
    })
    it(`${name} background variant is min-h-screen`, () => {
      const w = mount(Comp, { props: { content: heroBg } })
      expect(w.find('section').classes()).toContain('min-h-screen')
    })
  }
  for (const [name, Comp] of slides) {
    it(`${name} is min-h-screen`, () => {
      const w = mount(Comp, { props: { content: slide } })
      expect(w.find('section').classes()).toContain('min-h-screen')
    })
  }
})

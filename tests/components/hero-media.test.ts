import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/sections/HeroSection.vue'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'

const base = { title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD MMMM YYYY' }

for (const [name, Comp] of [['base', Hero], ['elegant', ElegantHero]] as const) {
  describe(`Hero background (${name})`, () => {
    it('renders the background photo + text when set', () => {
      const w = mount(Comp, { props: { content: { ...base, backgroundImage: { mediaId: 'm', url: 'https://cdn/bg.jpg' } } } })
      expect(w.text()).toContain('W & D')
      expect(w.html()).toContain('https://cdn/bg.jpg')
    })
    it('renders text only (no bg image) when unset', () => {
      const w = mount(Comp, { props: { content: { ...base, backgroundImage: { mediaId: '', url: '' } } } })
      expect(w.text()).toContain('W & D')
      expect(w.html()).not.toContain('background-image')
    })
  })
}

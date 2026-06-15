import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/HeroSlideshowSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/HeroSlideshowSection.vue'

const c = (over = {}) => ({ title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', images: [], ...over })

for (const [name, Comp] of [['base', Base], ['elegant', Elegant]] as const) {
  describe(`HeroSlideshow (${name})`, () => {
    it('renders images + text when images exist', () => {
      const w = mount(Comp, { props: { content: c({ images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, { mediaId: 'n', url: 'https://cdn/b.jpg' }] }) } })
      expect(w.findAll('img').length).toBe(2)
      expect(w.text()).toContain('W & D')
      expect(w.text()).toContain('01 September 2026')
    })
    it('renders text-only fallback when no images', () => {
      const w = mount(Comp, { props: { content: c() } })
      expect(w.find('img').exists()).toBe(false)
      expect(w.text()).toContain('W & D')
    })
  })
}

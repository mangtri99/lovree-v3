import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/GallerySection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/GallerySection.vue'
import DarkPrada from '../../app/components/invitation/themes/dark_prada/GallerySection.vue'

const content = { title: 'Momen Bahagia Kami', items: [{ mediaId: 'a', url: 'https://cdn/a.jpg' }, { mediaId: 'b', url: 'https://cdn/b.jpg' }] }

for (const [name, Comp] of [['base', Base], ['elegant', Elegant], ['dark_prada', DarkPrada]] as const) {
  describe(`GallerySection (${name})`, () => {
    it('renders a GalleryCarousel and the title heading', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.findComponent({ name: 'GalleryCarousel' }).exists()).toBe(true)
      expect(w.text()).toContain('Momen Bahagia Kami')
    })
    it('omits the heading when title is empty', () => {
      const w = mount(Comp, { props: { content: { title: '', items: content.items } } })
      expect(w.text()).not.toContain('Momen Bahagia Kami')
    })
  })
}

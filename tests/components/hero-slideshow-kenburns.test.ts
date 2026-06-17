// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/HeroSlideshowSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/HeroSlideshowSection.vue'
import DarkPrada from '../../app/components/invitation/themes/dark_prada/HeroSlideshowSection.vue'
import Maroon from '../../app/components/invitation/themes/maroon/HeroSlideshowSection.vue'

const content = { title: 'T', coupleName: 'A & B', date: '', dateFormat: 'DD MMMM YYYY', images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }] }

for (const [name, Comp] of [['base', Base], ['elegant', Elegant], ['dark_prada', DarkPrada], ['maroon', Maroon]] as const) {
  describe(`HeroSlideshow Ken Burns (${name})`, () => {
    it('applies the kb-pan animation class to the slide image', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.find('img').classes()).toContain('kb-pan')
    })
  })
}

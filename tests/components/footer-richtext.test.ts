import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/FooterSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/FooterSection.vue'

for (const [name, Comp] of [['base', Base], ['elegant', Elegant]] as const) {
  describe(`FooterSection (${name})`, () => {
    it('renders footer HTML via v-html', () => {
      const w = mount(Comp, { props: { content: { text: '<b>Terima kasih</b><ul><li>Keluarga</li></ul>' } } })
      expect(w.find('b').exists()).toBe(true)
      expect(w.find('li').text()).toBe('Keluarga')
    })
    it('falls back to the default when text is empty', () => {
      const w = mount(Comp, { props: { content: { text: '' } } })
      expect(w.text()).toContain('Made with Lovree')
      expect(w.find('b').exists()).toBe(false)
    })
  })
}

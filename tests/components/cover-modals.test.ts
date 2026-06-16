// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ElegantCover from '../../app/components/invitation/themes/elegant/CoverModal.vue'
import DarkPradaCover from '../../app/components/invitation/themes/dark_prada/CoverModal.vue'

const props = { title: 'Undangan Mepandes', coupleName: 'Putu & Kadek', guestName: 'Budi' }

for (const [name, Comp] of [['elegant', ElegantCover], ['dark_prada', DarkPradaCover]] as const) {
  describe(`${name} cover`, () => {
    it('renders couple + guest name', () => {
      const w = mount(Comp, { props })
      expect(w.text()).toContain('Putu & Kadek')
      expect(w.text()).toContain('Budi')
    })
    it('emits open on button click', async () => {
      const w = mount(Comp, { props })
      await w.find('button').trigger('click')
      expect(w.emitted('open')).toBeTruthy()
    })
  })
}

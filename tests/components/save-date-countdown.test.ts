import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/CountdownSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/CountdownSection.vue'
import DarkPrada from '../../app/components/invitation/themes/dark_prada/CountdownSection.vue'
import Maroon from '../../app/components/invitation/themes/maroon/CountdownSection.vue'

const content = { targetDate: '2030-01-01', title: 'Resepsi', location: 'Bali' }

for (const [name, Comp] of [['base', Base], ['elegant', Elegant], ['dark_prada', DarkPrada], ['maroon', Maroon]] as const) {
  describe(`CountdownSection (${name})`, () => {
    it('renders a SaveDateButton', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.findComponent({ name: 'SaveDateButton' }).exists()).toBe(true)
    })
  })
}

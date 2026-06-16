import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Base from '../../app/components/invitation/sections/MemberSection.vue'
import Elegant from '../../app/components/invitation/themes/elegant/MemberSection.vue'

const content = {
  members: [
    {
      parents: 'Bpk X & Ibu Y',
      childOrder: 'Anak ke-1 & ke-2',
      peoples: [
        { name: 'Putu', instagram: 'putu', photo: { mediaId: 'm', url: 'https://cdn/a.jpg' } },
        { name: 'Kadek', instagram: '', photo: { mediaId: '', url: '' } },
      ],
    },
  ],
}

for (const [name, Comp] of [['base', Base], ['elegant', Elegant]] as const) {
  describe(`MemberSection (${name})`, () => {
    it('renders the group parents/childOrder and each participant name', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.text()).toContain('Bpk X & Ibu Y')
      expect(w.text()).toContain('Anak ke-1 & ke-2')
      expect(w.text()).toContain('Putu')
      expect(w.text()).toContain('Kadek')
    })
    it('renders a participant photo when set', () => {
      const w = mount(Comp, { props: { content } })
      expect(w.find('img').exists()).toBe(true)
    })
    it('does not crash on empty members', () => {
      const w = mount(Comp, { props: { content: { members: [] } } })
      expect(w.find('img').exists()).toBe(false)
    })
  })
}

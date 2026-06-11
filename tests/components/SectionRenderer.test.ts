import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionRenderer from '../../app/components/invitation/SectionRenderer.vue'

describe('SectionRenderer', () => {
  it('renders the component matching the section type', () => {
    const w = mount(SectionRenderer, {
      props: { section: { type: 'quote', content: { text: 'Cinta sejati', source: 'X' } } },
    })
    expect(w.text()).toContain('Cinta sejati')
  })
  it('renders nothing for an unknown type without throwing', () => {
    const w = mount(SectionRenderer, { props: { section: { type: 'nope', content: {} } } })
    expect(w.html()).toBeDefined()
  })
})

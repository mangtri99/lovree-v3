import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OrnamentDivider from '../../app/components/invitation/OrnamentDivider.vue'

describe('OrnamentDivider', () => {
  it('line renders a rule, no svg', () => {
    const w = mount(OrnamentDivider, { props: { variant: 'line' } })
    expect(w.find('.h-px').exists()).toBe(true)
    expect(w.find('svg').exists()).toBe(false)
  })
  it('flourish renders an svg', () => {
    const w = mount(OrnamentDivider, { props: { variant: 'flourish' } })
    expect(w.find('svg').exists()).toBe(true)
  })
  it('none / unknown renders nothing', () => {
    expect(mount(OrnamentDivider, { props: { variant: 'none' } }).html()).toBe('<!--v-if-->')
    expect(mount(OrnamentDivider, { props: { variant: 'zzz' } }).html()).toBe('<!--v-if-->')
  })
})

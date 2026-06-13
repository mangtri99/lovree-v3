import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomSection from '../../app/components/invitation/sections/CustomSection.vue'

const content = (over = {}) => ({ title: 'Informasi Tambahan', items: [], ...over })

describe('CustomSection', () => {
  it('renders the title when set and a row label + value', () => {
    const w = mount(CustomSection, { props: { content: content({ items: [{ label: 'Dress Code', value: 'Batik' }] }) } })
    expect(w.text()).toContain('Informasi Tambahan')
    expect(w.text()).toContain('Dress Code')
    expect(w.text()).toContain('Batik')
  })
  it('hides the title when empty', () => {
    const w = mount(CustomSection, { props: { content: content({ title: '', items: [{ label: 'A', value: 'B' }] }) } })
    expect(w.find('h2').exists()).toBe(false)
  })
  it('skips a fully-empty row but keeps a label-only or value-only row', () => {
    const w = mount(CustomSection, { props: { content: content({ items: [{ label: '', value: '' }, { label: 'Hanya Label', value: '' }] }) } })
    expect(w.findAll('[data-row]').length).toBe(1)
    expect(w.text()).toContain('Hanya Label')
  })
  it('preserves multiline values via whitespace-pre-line', () => {
    const w = mount(CustomSection, { props: { content: content({ items: [{ label: 'Catatan', value: 'baris1\nbaris2' }] }) } })
    const valueEl = w.find('[data-value]')
    expect(valueEl.classes()).toContain('whitespace-pre-line')
  })
})

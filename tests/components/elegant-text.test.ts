import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Opening from '../../app/components/invitation/themes/elegant/OpeningSection.vue'
import Closing from '../../app/components/invitation/themes/elegant/ClosingSection.vue'
import Quote from '../../app/components/invitation/themes/elegant/QuoteSection.vue'
import Custom from '../../app/components/invitation/themes/elegant/CustomSection.vue'
import Footer from '../../app/components/invitation/themes/elegant/FooterSection.vue'

describe('elegant text sections', () => {
  it('Opening renders greeting + body', () => {
    const w = mount(Opening, { props: { content: { greeting: 'Om Swastiastu', body: 'Selamat datang' } } })
    expect(w.text()).toContain('Om Swastiastu'); expect(w.text()).toContain('Selamat datang')
  })
  it('Closing renders body', () => {
    expect(mount(Closing, { props: { content: { body: 'Terima kasih' } } }).text()).toContain('Terima kasih')
  })
  it('Quote renders text + source', () => {
    const w = mount(Quote, { props: { content: { text: 'Cinta', source: 'QS' } } })
    expect(w.text()).toContain('Cinta'); expect(w.text()).toContain('QS')
  })
  it('Custom renders title + non-empty rows, skipping empties', () => {
    const w = mount(Custom, { props: { content: { title: 'Info', items: [{ label: 'Dress', value: 'Batik' }, { label: '', value: '' }] } } })
    expect(w.text()).toContain('Info'); expect(w.text()).toContain('Dress'); expect(w.text()).toContain('Batik')
    expect(w.findAll('[data-row]').length).toBe(1)
  })
  it('Footer renders text', () => {
    expect(mount(Footer, { props: { content: { text: 'Salam' } } }).text()).toContain('Salam')
  })
})

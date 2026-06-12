import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionList from '../../app/components/editor/SectionList.vue'
import SectionEditor from '../../app/components/editor/SectionEditor.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const stubs = { ...nuxtUiStubs, UIcon: { props: ['name'], template: '<i class="icon" :data-icon="name" />' } }
const sections = [{ id: 'a', type: 'hero', enabled: true, content: { title: '', coupleName: '', date: '' } }]

describe('SectionList accordion', () => {
  it('renders a chevron per section and starts collapsed', () => {
    const w = mount(SectionList, { props: { sections }, global: { stubs } })
    expect(w.find('[data-icon="i-lucide-chevron-right"]').exists()).toBe(true)
    expect(w.findComponent(SectionEditor).exists()).toBe(false)
  })

  it('expands the section editor when the header is clicked', async () => {
    const w = mount(SectionList, { props: { sections }, global: { stubs } })
    const header = w.find('button[aria-expanded]')
    expect(header.attributes('aria-expanded')).toBe('false')
    await header.trigger('click')
    expect(w.find('button[aria-expanded]').attributes('aria-expanded')).toBe('true')
    expect(w.findComponent(SectionEditor).exists()).toBe(true)
  })

  it('shows the empty-state hint when there are no sections', () => {
    const w = mount(SectionList, { props: { sections: [] }, global: { stubs } })
    expect(w.text()).toContain('Belum ada bagian')
  })
})

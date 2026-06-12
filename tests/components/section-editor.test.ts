import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionEditor from '../../app/components/editor/SectionEditor.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

describe('SectionEditor', () => {
  it('renders a field editor per registry field and emits content updates', async () => {
    const section = { id: 'a', type: 'hero', enabled: true, content: { title: 'X', coupleName: '', date: '' } }
    const w = mount(SectionEditor, { props: { section }, global: { stubs: nuxtUiStubs } })
    expect(w.findAll('input').length).toBeGreaterThanOrEqual(3)
    const first = w.find('input')
    await first.setValue('Y')
    expect(w.emitted('set-field')).toBeTruthy()
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldEditor from '../../app/components/editor/FieldEditor.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const opts = { global: { stubs: nuxtUiStubs } }

describe('FieldEditor', () => {
  it('renders a text input for type text and emits update', async () => {
    const w = mount(FieldEditor, { props: { descriptor: { key: 'title', type: 'text', label: 'Judul' }, modelValue: 'A' }, ...opts })
    const input = w.find('input')
    expect((input.element as HTMLInputElement).value).toBe('A')
    await input.setValue('B')
    expect(w.emitted('update:modelValue')![0]).toEqual(['B'])
  })
  it('renders a textarea for longtext', () => {
    const w = mount(FieldEditor, { props: { descriptor: { key: 'body', type: 'longtext', label: 'Isi' }, modelValue: '' }, ...opts })
    expect(w.find('textarea').exists()).toBe(true)
  })
})

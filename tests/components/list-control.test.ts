import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ListControl from '../../app/components/editor/controls/ListControl.vue'

describe('ListControl', () => {
  it('pushes defaultItem when adding (type-correct gallery item)', async () => {
    const w = mount(ListControl, {
      props: {
        modelValue: [],
        itemFields: { type: { type: 'text', label: 'Tipe' } },
        defaultItem: { type: 'image', mediaId: '', url: '' },
      },
    })
    await w.find('button.rounded.border').trigger('click')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[0][0]).toEqual([{ type: 'image', mediaId: '', url: '' }])
  })

  it('falls back to an empty object when no defaultItem is provided', async () => {
    const w = mount(ListControl, { props: { modelValue: [], itemFields: { a: { type: 'text', label: 'A' } } } })
    await w.find('button.rounded.border').trigger('click')
    expect(w.emitted('update:modelValue')![0][0]).toEqual([{}])
  })
})

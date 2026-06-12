import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ListControl from '../../app/components/editor/controls/ListControl.vue'
import ImageControl from '../../app/components/editor/controls/ImageControl.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

// The real gallery itemFields, so the image control is wired exactly as in production.
const galleryItemFields = {
  type: { type: 'text', label: 'Tipe (image/youtube)' },
  image: { type: 'image', label: 'Gambar' },
  videoId: { type: 'youtube', label: 'YouTube ID' },
}

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

  // Regression: the image control emits a { mediaId, url } object; it must land under
  // the `image` field key so the schema accepts it (the original 2b bug stored it as a
  // string `mediaId` field, which the schema dropped → silent data loss).
  it('writes the image control object into the item.image field (editor roundtrip)', () => {
    const w = mount(ListControl, {
      props: {
        modelValue: [{ type: 'image', image: { mediaId: '', url: '' } }],
        itemFields: galleryItemFields,
        defaultItem: { type: 'image', image: { mediaId: '', url: '' } },
      },
      global: { stubs: nuxtUiStubs },
    })
    w.findComponent(ImageControl).vm.$emit('update:modelValue', { mediaId: 'abc', url: 'https://cdn/up.jpg' })
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[0][0]).toEqual([{ type: 'image', image: { mediaId: 'abc', url: 'https://cdn/up.jpg' } }])
  })

  it('falls back to an empty object when no defaultItem is provided', async () => {
    const w = mount(ListControl, { props: { modelValue: [], itemFields: { a: { type: 'text', label: 'A' } } } })
    await w.find('button.rounded.border').trigger('click')
    expect(w.emitted('update:modelValue')![0][0]).toEqual([{}])
  })
})

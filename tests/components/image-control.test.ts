import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageControl from '../../app/components/editor/controls/ImageControl.vue'
import MediaUploader from '../../app/components/editor/MediaUploader.vue'

describe('ImageControl', () => {
  it('emits { mediaId, url } when the uploader reports an upload', async () => {
    const w = mount(ImageControl, { props: { modelValue: { mediaId: '', url: '' }, label: 'Foto' } })
    const byName = w.findComponent({ name: 'MediaUploader' })
    const uploader = byName.exists() ? byName : w.findComponent(MediaUploader)
    uploader.vm.$emit('uploaded', { id: 'abc', url: 'https://cdn/x.jpg' })
    await w.vm.$nextTick()
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[0][0]).toEqual({ mediaId: 'abc', url: 'https://cdn/x.jpg' })
  })

  it('shows a thumbnail when a url is set', () => {
    const w = mount(ImageControl, { props: { modelValue: { mediaId: 'abc', url: 'https://cdn/x.jpg' }, label: 'Foto' } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn/x.jpg')
  })

  it('renders just the uploader when empty', () => {
    const w = mount(ImageControl, { props: { modelValue: { mediaId: '', url: '' }, label: 'Foto' } })
    expect(w.find('img').exists()).toBe(false)
  })
})

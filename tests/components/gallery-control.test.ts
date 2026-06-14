import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GalleryControl from '../../app/components/editor/controls/GalleryControl.vue'

const imgs = [
  { mediaId: 'a', url: 'https://cdn/a.jpg' },
  { mediaId: 'b', url: 'https://cdn/b.jpg' },
  { mediaId: 'c', url: 'https://cdn/c.jpg' },
]

describe('GalleryControl', () => {
  it('renders a thumbnail per image', () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs, label: 'Foto' } })
    expect(w.findAll('img').length).toBe(3)
    expect(w.find('img').attributes('src')).toBe('https://cdn/a.jpg')
  })
  it('move down swaps an item with the next', async () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs } })
    await w.findAll('[data-act="down"]')[0].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toEqual([imgs[1], imgs[0], imgs[2]])
  })
  it('move up swaps an item with the previous', async () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs } })
    await w.findAll('[data-act="up"]')[2].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toEqual([imgs[0], imgs[2], imgs[1]])
  })
  it('remove drops the item', async () => {
    const w = mount(GalleryControl, { props: { modelValue: imgs } })
    await w.findAll('[data-act="remove"]')[1].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toEqual([imgs[0], imgs[2]])
  })
})

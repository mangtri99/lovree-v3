import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GallerySection from '../../app/components/invitation/sections/GallerySection.vue'

describe('GallerySection', () => {
  it('renders an <img> per image with a non-empty url', () => {
    const w = mount(GallerySection, { props: { content: { items: [
      { mediaId: 'm1', url: 'https://cdn/a.jpg' },
      { mediaId: 'm2', url: 'https://cdn/b.jpg' },
    ] } } })
    const imgs = w.findAll('img')
    expect(imgs.length).toBe(2)
    expect(imgs[0].attributes('src')).toBe('https://cdn/a.jpg')
    expect(imgs[0].attributes('loading')).toBe('lazy')
  })
  it('skips an item with an empty url', () => {
    const w = mount(GallerySection, { props: { content: { items: [{ mediaId: '', url: '' }] } } })
    expect(w.find('img').exists()).toBe(false)
  })
})

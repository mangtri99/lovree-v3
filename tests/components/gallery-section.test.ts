import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GallerySection from '../../app/components/invitation/sections/GallerySection.vue'

const stubs = { YouTubeEmbed: { name: 'YouTubeEmbed', props: ['videoId'], template: '<div class="yt" />' } }

describe('GallerySection', () => {
  it('renders <img> with the stored url for image items', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [{ type: 'image', image: { mediaId: 'm1', url: 'https://cdn/x.jpg' } }] } },
      global: { stubs },
    })
    const img = w.find('img')
    expect(img.attributes('src')).toBe('https://cdn/x.jpg')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('renders YouTubeEmbed for valid youtube items and skips empty/invalid ones', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [
        { type: 'youtube', videoId: 'dQw4w9WgXcQ' },
        { type: 'youtube', videoId: '' },
        { type: 'youtube', videoId: 'abc' },
      ] } },
      global: { stubs },
    })
    expect(w.findAllComponents({ name: 'YouTubeEmbed' }).length).toBe(1)
  })

  it('does not render an img for an image item with empty url', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [{ type: 'image', image: { mediaId: '', url: '' } }] } },
      global: { stubs },
    })
    expect(w.find('img').exists()).toBe(false)
  })
})

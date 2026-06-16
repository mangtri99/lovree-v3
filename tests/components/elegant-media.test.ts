import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Gallery from '../../app/components/invitation/themes/elegant/GallerySection.vue'
import Video from '../../app/components/invitation/themes/elegant/VideoSection.vue'

const stubs = { YouTubeEmbed: { name: 'YouTubeEmbed', props: ['videoId'], template: '<div class="yt" />' } }

describe('elegant media sections', () => {
  it('Gallery renders an img per non-empty url', () => {
    const w = mount(Gallery, { props: { content: { items: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, { mediaId: '', url: '' }] } } })
    expect(w.find('[data-grid]').findAll('img').length).toBe(1)
    expect(w.find('[data-grid]').find('img').attributes('src')).toBe('https://cdn/a.jpg')
  })
  it('Video renders a YouTubeEmbed per valid id', () => {
    const w = mount(Video, { props: { content: { videos: [{ videoId: 'dQw4w9WgXcQ' }, { videoId: 'bad' }] } }, global: { stubs } })
    expect(w.findAllComponents({ name: 'YouTubeEmbed' }).length).toBe(1)
  })
})

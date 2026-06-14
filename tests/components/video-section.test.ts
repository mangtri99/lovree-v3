import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VideoSection from '../../app/components/invitation/sections/VideoSection.vue'

const stubs = { YouTubeEmbed: { name: 'YouTubeEmbed', props: ['videoId'], template: '<div class="yt" />' } }

describe('VideoSection', () => {
  it('renders a YouTubeEmbed for each valid 11-char id, skipping invalid/empty', () => {
    const w = mount(VideoSection, {
      props: { content: { videos: [{ videoId: 'dQw4w9WgXcQ' }, { videoId: '' }, { videoId: 'abc' }] } },
      global: { stubs },
    })
    expect(w.findAllComponents({ name: 'YouTubeEmbed' }).length).toBe(1)
  })
})

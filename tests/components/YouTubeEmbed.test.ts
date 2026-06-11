import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YouTubeEmbed from '../../app/components/invitation/YouTubeEmbed.vue'

describe('YouTubeEmbed', () => {
  it('shows a thumbnail facade first, no iframe', () => {
    const w = mount(YouTubeEmbed, { props: { videoId: 'dQw4w9WgXcQ' } })
    expect(w.find('iframe').exists()).toBe(false)
    expect(w.find('img').attributes('src')).toContain('dQw4w9WgXcQ')
  })
  it('loads the iframe after click', async () => {
    const w = mount(YouTubeEmbed, { props: { videoId: 'dQw4w9WgXcQ' } })
    await w.find('button').trigger('click')
    expect(w.find('iframe').attributes('src')).toContain('dQw4w9WgXcQ')
  })
})

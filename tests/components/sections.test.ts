import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroSection from '../../app/components/invitation/sections/HeroSection.vue'
import GallerySection from '../../app/components/invitation/sections/GallerySection.vue'
import LoveGiftSection from '../../app/components/invitation/sections/LoveGiftSection.vue'

describe('section components', () => {
  it('Hero renders title + couple name', () => {
    const w = mount(HeroSection, { props: { content: { title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' } } })
    expect(w.text()).toContain('The Wedding Of')
    expect(w.text()).toContain('Willy & Debby')
  })
  it('Gallery renders a YouTube item via embed', () => {
    const w = mount(GallerySection, {
      props: { content: { items: [{ type: 'youtube', videoId: 'dQw4w9WgXcQ' }] } },
      global: { stubs: { YouTubeEmbed: { props: ['videoId'], template: '<div class="yt">{{ videoId }}</div>' }, NuxtImg: true } },
    })
    expect(w.find('.yt').text()).toBe('dQw4w9WgXcQ')
  })
  it('LoveGift renders bank accounts', () => {
    const w = mount(LoveGiftSection, { props: { content: { note: 'Tanpa mengurangi rasa hormat', banks: [{ bank: 'BCA', number: '123', holder: 'Willy' }] } } })
    expect(w.text()).toContain('BCA')
    expect(w.text()).toContain('123')
  })
})

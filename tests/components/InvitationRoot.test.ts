import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InvitationRoot from '../../app/components/invitation/InvitationRoot.vue'

const data = {
  cssVars: { '--color-primary': '#abc' },
  musicUrl: 'https://x/song.mp3',
  sections: [
    { type: 'hero', content: { title: 'The Wedding Of', coupleName: 'Willy & Debby', date: '2026-09-01' } },
    { type: 'footer', content: { text: 'bye' } },
  ],
}

describe('InvitationRoot', () => {
  it('applies css vars and shows cover first (sections hidden)', () => {
    const w = mount(InvitationRoot, { props: { data, guestName: 'Budi' } })
    expect(w.attributes('style')).toContain('--color-primary: #abc')
    expect(w.findComponent({ name: 'CoverModal' }).exists()).toBe(true)
  })
  it('reveals sections after cover opens', async () => {
    const w = mount(InvitationRoot, { props: { data, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAllComponents({ name: 'SectionRenderer' }).length).toBe(2)
  })
})

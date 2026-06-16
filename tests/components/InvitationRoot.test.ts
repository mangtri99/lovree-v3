// @vitest-environment nuxt
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
  it('renders n-1 dividers between sections when divider=line', async () => {
    const d = { ...data, cssVars: { ...data.cssVars, '--ornament-divider': 'line' } }
    const w = mount(InvitationRoot, { props: { data: d, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAllComponents({ name: 'OrnamentDivider' }).length).toBe(1)
  })
  it('renders 4 corner motifs when motif=corners (after open)', async () => {
    const d = { ...data, cssVars: { ...data.cssVars, '--ornament-motif': 'corners' } }
    const w = mount(InvitationRoot, { props: { data: d, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAll('[data-motif-corner]').length).toBe(4)
  })
  it('renders no motif corners when motif is absent/none', async () => {
    const w = mount(InvitationRoot, { props: { data, guestName: 'Budi' } })
    await w.findComponent({ name: 'CoverModal' }).vm.$emit('open')
    expect(w.findAll('[data-motif-corner]').length).toBe(0)
  })
  it('renders the dark_prada cover when themeKey is dark_prada', () => {
    const d = { ...data, themeKey: 'dark_prada' }
    const w = mount(InvitationRoot, { props: { data: d, guestName: 'Budi' } })
    expect(w.findComponent({ name: 'DarkPradaCover' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'CoverModal' }).exists()).toBe(false)
  })
})
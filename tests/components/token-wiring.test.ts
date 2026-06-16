// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroSection from '../../app/components/invitation/sections/HeroSection.vue'
import EditorPreview from '../../app/components/editor/EditorPreview.vue'

describe('token wiring', () => {
  it('Hero eyebrow uses the secondary colour', () => {
    const w = mount(HeroSection, { props: { content: { title: 'The Wedding Of', coupleName: 'W & D', date: '' } } })
    const eyebrow = w.find('p.uppercase')
    expect(eyebrow.attributes('style')).toContain('var(--color-secondary)')
  })
  it('EditorPreview root applies the body font', () => {
    const w = mount(EditorPreview, { props: { sections: [], cssVars: {}, device: 'mobile', showCover: false } })
    expect(w.attributes('style')).toContain('font-family: var(--font-body)')
  })
})
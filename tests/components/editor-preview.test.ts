// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorPreview from '../../app/components/editor/EditorPreview.vue'

const doc = { sections: [{ id: 'a', type: 'hero', enabled: true, content: { title: 'The Wedding Of', coupleName: 'W & D', date: '' } }] }

describe('EditorPreview', () => {
  it('applies containment style and renders enabled sections', () => {
    const w = mount(EditorPreview, { props: { sections: doc.sections, cssVars: { '--color-primary': '#abc' }, device: 'desktop', showCover: false } })
    expect(w.attributes('style')).toContain('--color-primary: #abc')
    const frame = w.find('[data-preview-frame]')
    expect(frame.attributes('style')).toMatch(/transform|contain/)
    expect(w.findAllComponents({ name: 'SectionRenderer' }).length).toBe(1)
  })
  it('constrains width in mobile mode', () => {
    const w = mount(EditorPreview, { props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: false } })
    expect(w.find('[data-preview-frame]').attributes('style')).toContain('390px')
  })
  it('renders the cover when showCover is true and hides it when false', () => {
    const withCover = mount(EditorPreview, { props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: true } })
    expect(withCover.findComponent({ name: 'CoverModal' }).exists()).toBe(true)
    const withoutCover = mount(EditorPreview, { props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: false } })
    expect(withoutCover.findComponent({ name: 'CoverModal' }).exists()).toBe(false)
  })
  it('renders MusicPlayer when showing the cover with a musicUrl', () => {
    const w = mount(EditorPreview, {
      props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: true, musicUrl: 'https://cdn/song.mp3' },
      global: { stubs: { MusicPlayer: { name: 'MusicPlayer', props: ['src', 'playing'], template: '<div class="mp" />' } } },
    })
    expect(w.findComponent({ name: 'MusicPlayer' }).exists()).toBe(true)
  })
  it('does not render MusicPlayer without a musicUrl', () => {
    const w = mount(EditorPreview, {
      props: { sections: doc.sections, cssVars: {}, device: 'mobile', showCover: true },
      global: { stubs: { MusicPlayer: { name: 'MusicPlayer', props: ['src', 'playing'], template: '<div class="mp" />' } } },
    })
    expect(w.findComponent({ name: 'MusicPlayer' }).exists()).toBe(false)
  })
})
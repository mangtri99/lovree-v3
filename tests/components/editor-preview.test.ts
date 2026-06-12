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
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemePreviewCard from '../../app/components/theme/ThemePreviewCard.vue'

const theme = (over: any = {}) => ({
  id: 't1',
  name: 'Dark Prada',
  tokens: {
    color: { primary: '#fcc889', secondary: '#3a3a3a', bg: '#1b1a17', text: '#fbfbfb', accent: '#b2d0df' },
    font: { heading: 'Courgette', body: 'DM Sans' },
    ornament: { divider: 'flourish', motif: 'none' },
    ...over,
  },
})

describe('ThemePreviewCard', () => {
  it('shows the theme name and a couple-name sample', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: false } })
    expect(w.text()).toContain('Dark Prada')
    expect(w.text()).toContain('Budi & Ani')
  })
  it('applies the theme bg as a css var on the card', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: false } })
    expect(w.html()).toContain('--color-bg: #1b1a17')
  })
  it('renders five colour swatches', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: false } })
    expect(w.findAll('[data-swatch]').length).toBe(5)
  })
  it('renders a flourish svg, and none when divider=none', () => {
    expect(mount(ThemePreviewCard, { props: { theme: theme(), selected: false } }).find('svg').exists()).toBe(true)
    const none = mount(ThemePreviewCard, { props: { theme: theme({ ornament: { divider: 'none', motif: 'none' } }), selected: false } })
    expect(none.find('svg').exists()).toBe(false)
  })
  it('marks the selected state', () => {
    const w = mount(ThemePreviewCard, { props: { theme: theme(), selected: true } })
    expect(w.find('button').classes()).toContain('ring-2')
  })
})

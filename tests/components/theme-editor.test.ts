import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeEditor from '../../app/components/theme/ThemeEditor.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const stubs = { ...nuxtUiStubs, ThemePreviewCard: { name: 'ThemePreviewCard', props: ['theme', 'selected'], template: '<div class="tpc">{{ theme.tokens.color.primary }}</div>' } }

describe('ThemeEditor', () => {
  it('renders a live preview seeded from base tokens for a new theme', () => {
    const w = mount(ThemeEditor, { props: { theme: null, onSubmit: vi.fn() }, global: { stubs } })
    expect(w.findComponent({ name: 'ThemePreviewCard' }).exists()).toBe(true)
  })
  it('submits the assembled name/key/tokens', async () => {
    const onSubmit = vi.fn()
    const theme = { id: 't', name: 'Tema X', key: 'maroon', tokens: {
      color: { primary: '#7a1f2b', secondary: '#9c6b6b', bg: '#fbf6ee', text: '#3a2326', accent: '#c0962f' },
      font: { heading: 'Cinzel', body: 'Lora' }, radius: { sm: '4px', md: '6px', lg: '8px' }, ornament: { divider: 'line', motif: 'none' },
    } }
    const w = mount(ThemeEditor, { props: { theme, onSubmit }, global: { stubs } })
    await w.find('[data-save]').trigger('click')
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tema X', key: 'maroon', tokens: expect.objectContaining({ color: expect.any(Object) }) }))
  })
})

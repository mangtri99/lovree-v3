import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemePicker from '../../app/components/theme/ThemePicker.vue'

const tk = (over: any = {}) => ({ color: { primary: '#111', secondary: '#222', bg: '#333', text: '#444', accent: '#555' }, font: { heading: 'Cinzel', body: 'Lora' }, ornament: { divider: 'line', motif: 'none' }, ...over })
const themes = [
  { id: 'a', name: 'Alpha', tokens: tk() },
  { id: 'b', name: 'Beta', tokens: tk() },
]

describe('ThemePicker', () => {
  it('renders a card per theme', () => {
    const w = mount(ThemePicker, { props: { themes, modelValue: 'a' } })
    expect(w.findAllComponents({ name: 'ThemePreviewCard' }).length).toBe(2)
  })
  it('marks the card matching modelValue as selected', () => {
    const w = mount(ThemePicker, { props: { themes, modelValue: 'b' } })
    const cards = w.findAllComponents({ name: 'ThemePreviewCard' })
    expect(cards[1].props('selected')).toBe(true)
    expect(cards[0].props('selected')).toBe(false)
  })
  it('emits update:modelValue with the clicked theme id', async () => {
    const w = mount(ThemePicker, { props: { themes, modelValue: 'a' } })
    await w.findAll('button')[1].trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual(['b'])
  })
  it('renders nothing for empty themes', () => {
    const w = mount(ThemePicker, { props: { themes: [], modelValue: '' } })
    expect(w.findAllComponents({ name: 'ThemePreviewCard' }).length).toBe(0)
  })
})

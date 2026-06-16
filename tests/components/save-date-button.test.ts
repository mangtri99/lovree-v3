import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaveDateButton from '../../app/components/invitation/SaveDateButton.vue'

describe('SaveDateButton', () => {
  it('renders a Google Calendar link when the date is valid', () => {
    const w = mount(SaveDateButton, { props: { title: 'Resepsi', date: '2026-09-01', location: 'Bali' } })
    const a = w.find('a')
    expect(a.exists()).toBe(true)
    expect(a.attributes('href')).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render/)
    expect(a.attributes('target')).toBe('_blank')
  })
  it('renders nothing when there is no valid date', () => {
    const w = mount(SaveDateButton, { props: { title: 'Resepsi', date: '' } })
    expect(w.find('a').exists()).toBe(false)
  })
})

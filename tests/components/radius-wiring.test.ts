import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Event from '../../app/components/invitation/sections/EventSection.vue'
import LoveGift from '../../app/components/invitation/sections/LoveGiftSection.vue'

describe('radius token wiring', () => {
  it('event card uses var(--radius-lg)', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'A', date: '', dateFormat: 'DD MMMM YYYY', timeStart: '', timeEnd: '', venue: '', mapsUrl: '' }] } } })
    expect(w.html()).toContain('border-radius: var(--radius-lg)')
  })
  it('love_gift card uses var(--radius-lg)', () => {
    const w = mount(LoveGift, { props: { content: { note: '', banks: [{ bank: 'BCA', number: '1', holder: 'X' }] } } })
    expect(w.html()).toContain('border-radius: var(--radius-lg)')
  })
})

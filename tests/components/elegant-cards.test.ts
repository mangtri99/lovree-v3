import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Event from '../../app/components/invitation/themes/elegant/EventSection.vue'
import LoveGift from '../../app/components/invitation/themes/elegant/LoveGiftSection.vue'
import Info from '../../app/components/invitation/themes/elegant/InfoSection.vue'
import Countdown from '../../app/components/invitation/themes/elegant/CountdownSection.vue'

describe('elegant card sections', () => {
  it('Event renders event name/date/venue', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '1 Sep', timeStart: '09:00', timeEnd: '', venue: 'Bali', mapsUrl: '' }] } } })
    expect(w.text()).toContain('Resepsi'); expect(w.text()).toContain('Bali')
  })
  it('LoveGift renders a bank account', () => {
    const w = mount(LoveGift, { props: { content: { note: 'Hadiah', banks: [{ bank: 'BCA', number: '123', holder: 'Willy' }] } } })
    expect(w.text()).toContain('BCA'); expect(w.text()).toContain('123'); expect(w.text()).toContain('Willy')
  })
  it('Info renders phone + social', () => {
    const w = mount(Info, { props: { content: { phone: '0812', socials: [{ label: 'IG', url: 'https://x' }] } } })
    expect(w.text()).toContain('0812'); expect(w.text()).toContain('IG')
  })
  it('Countdown renders unit labels', () => {
    const w = mount(Countdown, { props: { content: { targetDate: '2099-01-01T00:00:00' } } })
    expect(w.text()).toContain('Hari'); expect(w.text()).toContain('Detik')
  })
})

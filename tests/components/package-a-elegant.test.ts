import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/themes/elegant/HeroSection.vue'
import Event from '../../app/components/invitation/themes/elegant/EventSection.vue'
import Closing from '../../app/components/invitation/themes/elegant/ClosingSection.vue'

describe('package A elegant render', () => {
  it('Hero formats the date', () => {
    const w = mount(Hero, { props: { content: { title: 'T', coupleName: 'W & D', date: '2026-09-01', dateFormat: 'DD/MM/YYYY' } } })
    expect(w.text()).toContain('01/09/2026')
  })
  it('Event formats the date', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '', timeEnd: '', venue: '', mapsUrl: '' }] } } })
    expect(w.text()).toContain('01 September 2026')
  })
  it('Closing renders greeting + body', () => {
    const w = mount(Closing, { props: { content: { greeting: 'Om Swastiastu', body: 'Terima kasih' } } })
    expect(w.text()).toContain('Om Swastiastu'); expect(w.text()).toContain('Terima kasih')
  })
})

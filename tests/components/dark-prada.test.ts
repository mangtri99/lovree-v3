// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/themes/dark_prada/HeroSection.vue'
import Member from '../../app/components/invitation/themes/dark_prada/MemberSection.vue'
import Closing from '../../app/components/invitation/themes/dark_prada/ClosingSection.vue'
import Event from '../../app/components/invitation/themes/dark_prada/EventSection.vue'
import Gallery from '../../app/components/invitation/themes/dark_prada/GallerySection.vue'

describe('dark_prada group A', () => {
  it('hero renders title + couple name', () => {
    const w = mount(Hero, { props: { content: { title: 'Mepandes', coupleName: 'Putu & Kadek', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', backgroundImage: { mediaId: '', url: '' } } } })
    expect(w.text()).toContain('Putu & Kadek')
  })
  it('member renders participants + parents', () => {
    const w = mount(Member, { props: { content: { members: [{ parents: 'Bpk X', childOrder: 'Anak ke-1', peoples: [{ name: 'Putu', instagram: '', photo: { mediaId: '', url: '' } }] }] } } })
    expect(w.text()).toContain('Putu')
    expect(w.text()).toContain('Bpk X')
  })
  it('closing renders without crashing on empty', () => {
    const w = mount(Closing, { props: { content: { greeting: '', body: '' } } })
    expect(w.find('section').exists()).toBe(true)
  })
})

describe('dark_prada group B', () => {
  it('event renders an event name + maps link', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Mepandes', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '10:00', timeEnd: '12:00', venue: 'Bali', mapsUrl: 'https://maps.google.com/x' }] } } })
    expect(w.text()).toContain('Mepandes')
    expect(w.html()).toContain('https://maps.google.com/x')
  })
  it('gallery renders only items with a url', () => {
    const w = mount(Gallery, { props: { content: { items: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }, { mediaId: '', url: '' }] } } })
    expect(w.findAll('img').length).toBe(1)
  })
})

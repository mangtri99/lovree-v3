import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hero from '../../app/components/invitation/themes/maroon/HeroSection.vue'
import Member from '../../app/components/invitation/themes/maroon/MemberSection.vue'
import Closing from '../../app/components/invitation/themes/maroon/ClosingSection.vue'
import Event from '../../app/components/invitation/themes/maroon/EventSection.vue'
import Gallery from '../../app/components/invitation/themes/maroon/GallerySection.vue'

describe('maroon group A', () => {
  it('hero renders couple name', () => {
    const w = mount(Hero, { props: { content: { title: 'Pernikahan', coupleName: 'Putu & Kadek', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', backgroundImage: { mediaId: '', url: '' } } } })
    expect(w.text()).toContain('Putu & Kadek')
  })
  it('member renders participant + parents', () => {
    const w = mount(Member, { props: { content: { members: [{ parents: 'Bpk X', childOrder: 'Anak ke-1', peoples: [{ name: 'Putu', instagram: '', photo: { mediaId: '', url: '' } }] }] } } })
    expect(w.text()).toContain('Putu')
    expect(w.text()).toContain('Bpk X')
  })
  it('closing renders without crashing on empty', () => {
    const w = mount(Closing, { props: { content: { greeting: '', body: '' } } })
    expect(w.find('section').exists()).toBe(true)
  })
})

describe('maroon group B', () => {
  it('event renders name + maps link', () => {
    const w = mount(Event, { props: { content: { events: [{ name: 'Resepsi', date: '2026-09-01', dateFormat: 'DD MMMM YYYY', timeStart: '10:00', timeEnd: '12:00', venue: 'Bali', mapsUrl: 'https://maps.google.com/x' }] } } })
    expect(w.text()).toContain('Resepsi')
    expect(w.html()).toContain('https://maps.google.com/x')
  })
  it('gallery renders a GalleryCarousel and title', () => {
    const w = mount(Gallery, { props: { content: { title: 'Galeri', items: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }] } } })
    expect(w.findComponent({ name: 'GalleryCarousel' }).exists()).toBe(true)
    expect(w.text()).toContain('Galeri')
  })
})

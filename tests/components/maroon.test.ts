import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Cover from '../../app/components/invitation/themes/maroon/CoverModal.vue'
import Hero from '../../app/components/invitation/themes/maroon/HeroSection.vue'
import Member from '../../app/components/invitation/themes/maroon/MemberSection.vue'
import Closing from '../../app/components/invitation/themes/maroon/ClosingSection.vue'
import Event from '../../app/components/invitation/themes/maroon/EventSection.vue'
import Gallery from '../../app/components/invitation/themes/maroon/GallerySection.vue'
import Info from '../../app/components/invitation/themes/maroon/InfoSection.vue'
import Footer from '../../app/components/invitation/themes/maroon/FooterSection.vue'
import Couple from '../../app/components/invitation/themes/maroon/CoupleSection.vue'
import Quote from '../../app/components/invitation/themes/maroon/QuoteSection.vue'
import HeroSlideshow from '../../app/components/invitation/themes/maroon/HeroSlideshowSection.vue'

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

describe('maroon group C', () => {
  it('info renders phone', () => {
    const w = mount(Info, { props: { content: { phone: '0812', socials: [{ label: 'Instagram', url: 'https://instagram.com/x' }] } } })
    expect(w.text()).toContain('0812')
  })
  it('footer renders its text', () => {
    const w = mount(Footer, { props: { content: { text: '<b>Terima kasih</b>' } } })
    expect(w.find('b').exists()).toBe(true)
  })
})

describe('maroon cover', () => {
  it('renders couple + guest name and emits open', async () => {
    const w = mount(Cover, { props: { title: 'Pernikahan', coupleName: 'Putu & Kadek', guestName: 'Budi' } })
    expect(w.text()).toContain('Putu & Kadek')
    expect(w.text()).toContain('Budi')
    await w.find('button').trigger('click')
    expect(w.emitted('open')).toBeTruthy()
  })
})

describe('maroon cohesive group', () => {
  it('couple renders a person name', () => {
    const w = mount(Couple, { props: { content: { people: [{ name: 'Putu', parents: '', childOrder: '', address: '', instagram: '', photo: { mediaId: '', url: '' } }] } } })
    expect(w.text()).toContain('Putu')
  })
  it('quote renders text', () => {
    const w = mount(Quote, { props: { content: { text: 'Cinta', source: 'X' } } })
    expect(w.text()).toContain('Cinta')
  })
  it('hero_slideshow renders couple name + a slide image', () => {
    const w = mount(HeroSlideshow, { props: { content: { title: 'T', coupleName: 'Putu & Kadek', date: '', dateFormat: 'DD MMMM YYYY', images: [{ mediaId: 'm', url: 'https://cdn/a.jpg' }] } } })
    expect(w.text()).toContain('Putu & Kadek')
    expect(w.find('img').exists()).toBe(true)
  })
})

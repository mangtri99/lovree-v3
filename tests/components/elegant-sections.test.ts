import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ElegantHero from '../../app/components/invitation/themes/elegant/HeroSection.vue'
import ElegantCouple from '../../app/components/invitation/themes/elegant/CoupleSection.vue'

describe('elegant theme sections', () => {
  it('Hero renders title, couple name, date', () => {
    const w = mount(ElegantHero, { props: { content: { title: 'The Wedding Of', coupleName: 'W & D', date: '1 Sep 2026' } } })
    expect(w.text()).toContain('W & D')
    expect(w.text()).toContain('The Wedding Of')
    expect(w.text()).toContain('1 Sep 2026')
  })
  it('Couple renders each person name', () => {
    const person = (n: string) => ({ name: n, parents: '', childOrder: '', address: '', instagram: '', photo: { mediaId: '', url: '' } })
    const w = mount(ElegantCouple, { props: { content: { people: [person('Willy'), person('Debby')] } } })
    expect(w.text()).toContain('Willy')
    expect(w.text()).toContain('Debby')
  })
})

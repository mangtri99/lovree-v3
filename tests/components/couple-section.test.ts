import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoupleSection from '../../app/components/invitation/sections/CoupleSection.vue'

const person = (over = {}) => ({ name: 'Willy', parents: '', childOrder: '', address: '', instagram: '', photo: { mediaId: '', url: '' }, ...over })

describe('CoupleSection', () => {
  it('renders a photo when photo.url is set', () => {
    const w = mount(CoupleSection, { props: { content: { people: [person({ photo: { mediaId: 'm1', url: 'https://cdn/p.jpg' } })] } } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://cdn/p.jpg')
  })
  it('renders no photo when url is empty', () => {
    const w = mount(CoupleSection, { props: { content: { people: [person()] } } })
    expect(w.find('img').exists()).toBe(false)
  })
})

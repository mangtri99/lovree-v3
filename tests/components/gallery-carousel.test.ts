import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GalleryCarousel from '../../app/components/invitation/GalleryCarousel.vue'

const imgs = (n: number) => Array.from({ length: n }, (_, i) => ({ mediaId: `m${i}`, url: `https://cdn/${i}.jpg` }))

describe('GalleryCarousel', () => {
  it('renders a main image and one thumbnail per image', () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(3) } })
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/0.jpg')
    expect(w.findAll('[data-thumb]').length).toBe(3)
  })
  it('next advances the main image and wraps', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(2) } })
    await w.find('[data-next]').trigger('click')
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/1.jpg')
    await w.find('[data-next]').trigger('click')
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/0.jpg')
  })
  it('clicking a thumbnail sets the main image', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(3) } })
    await w.findAll('[data-thumb]')[2].trigger('click')
    expect(w.find('[data-main]').attributes('src')).toBe('https://cdn/2.jpg')
  })
  it('clicking the main image opens the lightbox; close hides it', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(2) } })
    expect(w.find('[data-lightbox]').exists()).toBe(false)
    await w.find('[data-main]').trigger('click')
    expect(w.find('[data-lightbox]').exists()).toBe(true)
    await w.find('[data-close]').trigger('click')
    expect(w.find('[data-lightbox]').exists()).toBe(false)
  })
  it('one image: no arrows, no thumbnails, still opens lightbox', async () => {
    const w = mount(GalleryCarousel, { props: { images: imgs(1) } })
    expect(w.find('[data-next]').exists()).toBe(false)
    expect(w.findAll('[data-thumb]').length).toBe(0)
    await w.find('[data-main]').trigger('click')
    expect(w.find('[data-lightbox]').exists()).toBe(true)
  })
  it('zero images renders nothing', () => {
    const w = mount(GalleryCarousel, { props: { images: [] } })
    expect(w.find('[data-main]').exists()).toBe(false)
  })
})

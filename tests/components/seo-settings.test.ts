import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SeoSettings from '../../app/components/editor/SeoSettings.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const MediaUploader = { name: 'MediaUploader', props: ['kind'], emits: ['uploaded'], template: '<button class="mu" @click="$emit(\'uploaded\', { id: \'m9\', url: \'https://cdn/up.jpg\' })">up</button>' }
const stubs = { ...nuxtUiStubs, MediaUploader }

const seo = { title: 'Judul', description: 'Deskripsi', ogImage: { mediaId: '', url: '' } }

describe('SeoSettings', () => {
  it('renders current title + description', () => {
    const w = mount(SeoSettings, { props: { seo, onSave: vi.fn() }, global: { stubs } })
    expect(w.html()).toContain('Judul')
    expect(w.html()).toContain('Deskripsi')
  })

  it('saves the og image url when MediaUploader emits uploaded', async () => {
    const onSave = vi.fn()
    const w = mount(SeoSettings, { props: { seo, onSave }, global: { stubs } })
    await w.find('button.mu').trigger('click')
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ ogImage: { mediaId: 'm9', url: 'https://cdn/up.jpg' } }))
  })
})

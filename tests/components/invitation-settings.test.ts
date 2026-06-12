import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InvitationSettings from '../../app/components/editor/InvitationSettings.vue'
import MediaUploader from '../../app/components/editor/MediaUploader.vue'

describe('InvitationSettings', () => {
  it('emits update:musicUrl with the uploaded url after the music upload', async () => {
    const onSetMusic = vi.fn().mockResolvedValue(undefined)
    const w = mount(InvitationSettings, { props: { musicUrl: null, onSetMusic } })
    const uploader = w.findComponent(MediaUploader)
    uploader.vm.$emit('uploaded', { id: 'aud1', url: 'https://cdn/song.mp3' })
    await w.vm.$nextTick()
    await Promise.resolve()
    expect(onSetMusic).toHaveBeenCalledWith('aud1')
    expect(w.emitted('update:musicUrl')![0][0]).toBe('https://cdn/song.mp3')
  })

  it('shows the current track + a remove button when musicUrl is set', () => {
    const w = mount(InvitationSettings, { props: { musicUrl: 'https://cdn/song.mp3', onSetMusic: vi.fn() } })
    expect(w.find('audio').attributes('src')).toBe('https://cdn/song.mp3')
    expect(w.find('button').exists()).toBe(true)
  })
})

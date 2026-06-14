import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InvitationSettings from '../../app/components/editor/InvitationSettings.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'

const tracks = [{ id: 't1', name: 'Lagu A', url: 'https://cdn/a.mp3' }, { id: 't2', name: 'Lagu B', url: 'https://cdn/b.mp3' }]
const opts = {
  global: {
    stubs: {
      ...nuxtUiStubs,
      USelect: {
        props: ['modelValue', 'items'],
        emits: ['update:modelValue'],
        template: `<select @change="$emit('update:modelValue', $event.target.value)"><option v-for="it in items" :key="it.value" :value="it.value">{{ it.label }}</option></select>`,
      },
      NuxtLink: { template: '<a><slot/></a>' },
    },
  },
}

describe('InvitationSettings', () => {
  it('lists the user tracks plus a no-music option', () => {
    const w = mount(InvitationSettings, { props: { tracks, musicTrackId: null, onSetMusic: vi.fn() }, ...opts })
    const text = w.find('select').text()
    expect(text).toContain('Lagu A')
    expect(text).toContain('Lagu B')
    expect(text).toContain('tanpa musik')
  })
  it('calls onSetMusic with the chosen track id and emits its url', async () => {
    const onSetMusic = vi.fn().mockResolvedValue(undefined)
    const w = mount(InvitationSettings, { props: { tracks, musicTrackId: null, onSetMusic }, ...opts })
    await w.find('select').setValue('t1')
    await Promise.resolve()
    expect(onSetMusic).toHaveBeenCalledWith('t1')
    expect(w.emitted('update:musicUrl')!.at(-1)![0]).toBe('https://cdn/a.mp3')
  })
  it('calls onSetMusic with null when picking no-music', async () => {
    const onSetMusic = vi.fn().mockResolvedValue(undefined)
    const w = mount(InvitationSettings, { props: { tracks, musicTrackId: 't1', onSetMusic }, ...opts })
    await w.find('select').setValue('none')
    await Promise.resolve()
    expect(onSetMusic).toHaveBeenCalledWith(null)
    expect(w.emitted('update:musicUrl')!.at(-1)![0]).toBe(null)
  })
})

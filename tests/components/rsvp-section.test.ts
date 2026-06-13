import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import RsvpSection from '../../app/components/invitation/sections/RsvpSection.vue'

const content = { title: 'Konfirmasi Kehadiran & Doa' }
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('RsvpSection', () => {
  it('submits the form and prepends the messaged entry to the guestbook', async () => {
    const entry = { name: 'Budi', message: 'Selamat', attendance: 'yes' }
    fetchMock.mockResolvedValue({ ok: true, entry })
    const guestbook = ref<any[]>([])
    const w = mount(RsvpSection, { props: { content }, global: { provide: { guestbook, guestName: 'Budi', slug: 'elrumi', guestCode: 'budi-x7k2' } } })

    await w.find('input').setValue('Budi')
    await w.find('textarea').setValue('Selamat')
    await w.find('form').trigger('submit.prevent')
    await nextTick(); await Promise.resolve(); await nextTick()

    expect(fetchMock).toHaveBeenCalledWith('/api/invitations/elrumi/rsvp', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ name: 'Budi', attendance: 'yes', message: 'Selamat', guest: 'budi-x7k2' }),
    }))
    expect(guestbook.value[0]).toEqual(entry)
    expect(w.text()).toContain('Terima kasih')
  })

  it('prefills the name from the injected guestName', () => {
    fetchMock.mockResolvedValue({ ok: true, entry: { name: '', message: '', attendance: 'yes' } })
    const w = mount(RsvpSection, { props: { content }, global: { provide: { guestbook: ref([]), guestName: 'Siti' } } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('Siti')
  })
})

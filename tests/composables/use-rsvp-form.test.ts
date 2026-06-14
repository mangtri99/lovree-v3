import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useRsvpForm } from '../../app/composables/useRsvpForm'

const fetchMock = vi.fn()
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('$fetch', fetchMock) })

function host() {
  return defineComponent({ setup: () => { const f = useRsvpForm(); return { f } }, render: () => h('div') })
}

describe('useRsvpForm', () => {
  it('prefills name from guestName and submits, prepending a messaged entry', async () => {
    const entry = { name: 'Budi', message: 'Selamat', attendance: 'yes' }
    fetchMock.mockResolvedValue({ ok: true, entry })
    const guestbook = ref<any[]>([])
    const w = mount(host(), { global: { provide: { guestbook, guestName: 'Budi', slug: 'elrumi', guestCode: 'budi-x7k2' } } })
    const f = (w.vm as any).f
    expect(f.name.value).toBe('Budi')
    f.message.value = 'Selamat'
    await f.submit()
    expect(fetchMock).toHaveBeenCalledWith('/api/invitations/elrumi/rsvp', expect.objectContaining({
      method: 'POST', body: expect.objectContaining({ name: 'Budi', attendance: 'yes', message: 'Selamat', guest: 'budi-x7k2' }),
    }))
    expect(guestbook.value[0]).toEqual(entry)
    expect(f.done.value).toBe(true)
  })
})

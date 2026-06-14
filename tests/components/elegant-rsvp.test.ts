import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import Rsvp from '../../app/components/invitation/themes/elegant/RsvpSection.vue'
import Guestbook from '../../app/components/invitation/themes/elegant/GuestbookSection.vue'

const fetchMock = vi.fn()
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('$fetch', fetchMock) })

describe('elegant rsvp + guestbook', () => {
  it('Rsvp submits and prepends a messaged entry', async () => {
    const entry = { name: 'Budi', message: 'Selamat', attendance: 'yes' }
    fetchMock.mockResolvedValue({ ok: true, entry })
    const guestbook = ref<any[]>([])
    const w = mount(Rsvp, { props: { content: { title: 'RSVP' } }, global: { provide: { guestbook, guestName: 'Budi', slug: 's', guestCode: 'c' } } })
    await w.find('textarea').setValue('Selamat')
    await w.find('form').trigger('submit.prevent')
    await nextTick(); await Promise.resolve(); await nextTick()
    expect(guestbook.value[0]).toEqual(entry)
    expect(w.text()).toContain('Terima kasih')
  })
  it('Guestbook renders injected entries + attendance label', () => {
    const guestbook = ref([{ name: 'Siti', message: 'Doa', attendance: 'yes' }])
    const w = mount(Guestbook, { props: { content: { title: 'Ucapan' } }, global: { provide: { guestbook } } })
    expect(w.text()).toContain('Siti'); expect(w.text()).toContain('Doa'); expect(w.text()).toContain('Hadir')
  })
})

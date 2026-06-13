import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import GuestbookSection from '../../app/components/invitation/sections/GuestbookSection.vue'

const content = { title: 'Ucapan & Doa' }

describe('GuestbookSection', () => {
  it('renders injected entries with name, message, and attendance label', () => {
    const guestbook = ref([{ name: 'Budi', message: 'Selamat ya', attendance: 'yes' }])
    const w = mount(GuestbookSection, { props: { content }, global: { provide: { guestbook } } })
    expect(w.text()).toContain('Budi')
    expect(w.text()).toContain('Selamat ya')
    expect(w.text()).toContain('Hadir')
  })
  it('shows the empty state when there are no entries', () => {
    const w = mount(GuestbookSection, { props: { content }, global: { provide: { guestbook: ref([]) } } })
    expect(w.text()).toContain('Belum ada ucapan')
  })
})

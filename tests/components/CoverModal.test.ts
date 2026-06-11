import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverModal from '../../app/components/invitation/CoverModal.vue'

describe('CoverModal', () => {
  it('shows title, couple, and guest name', () => {
    const w = mount(CoverModal, { props: { title: 'The Wedding Of', coupleName: 'Willy & Debby', guestName: 'Budi' } })
    expect(w.text()).toContain('Willy & Debby')
    expect(w.text()).toContain('Budi')
  })
  it('emits open when the button is clicked', async () => {
    const w = mount(CoverModal, { props: { title: 'T', coupleName: 'C', guestName: 'G' } })
    await w.find('button').trigger('click')
    expect(w.emitted('open')).toBeTruthy()
  })
})

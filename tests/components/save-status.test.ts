import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaveStatus from '../../app/components/editor/SaveStatus.vue'

describe('SaveStatus', () => {
  it('shows saving / saved / error text by state', () => {
    expect(mount(SaveStatus, { props: { state: 'saving' } }).text()).toMatch(/Menyimpan/)
    expect(mount(SaveStatus, { props: { state: 'saved' } }).text()).toMatch(/Tersimpan/)
    expect(mount(SaveStatus, { props: { state: 'error' } }).text()).toMatch(/Gagal/)
  })
})

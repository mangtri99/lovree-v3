import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RichTextControl from '../../app/components/editor/controls/RichTextControl.vue'

const ClientOnly = { template: '<div><slot /></div>' }

describe('RichTextControl', () => {
  it('renders the label and B/I/list toolbar buttons', async () => {
    const w = mount(RichTextControl, {
      props: { label: 'Teks Footer', modelValue: '<p>Hi</p>' },
      global: { stubs: { ClientOnly } },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).toContain('Teks Footer')
    const btns = w.findAll('button')
    expect(btns.length).toBeGreaterThanOrEqual(3)
    expect(w.html()).toMatch(/Bold|aria-label="Bold"|title="Bold"/i)
  })

  it('renders underline, heading dropdown, and alignment controls', async () => {
    const w = mount(RichTextControl, {
      props: { label: 'Teks Footer', modelValue: '<p>Hi</p>' },
      global: { stubs: { ClientOnly } },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(w.html()).toMatch(/aria-label="Underline"|title="Underline"/i)
    expect(w.find('select').exists()).toBe(true)
    expect(w.find('select').findAll('option').length).toBe(4)
    expect(w.html()).toMatch(/aria-label="Rata Tengah"|title="Rata Tengah"/i)
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DesignControls from '../../app/components/editor/DesignControls.vue'
import { HEADING_FONTS, BODY_FONTS } from '../../server/theme/fonts'

const themeTokens = { color: { primary: '#111111', secondary: '#222222', accent: '#333333' }, font: { heading: 'Marcellus', body: 'Lora' } }

describe('DesignControls', () => {
  it('lists the curated fonts per role plus an inherit option', () => {
    const w = mount(DesignControls, { props: { modelValue: {}, themeTokens } })
    const heading = w.find('select[data-font="heading"]')
    const body = w.find('select[data-font="body"]')
    for (const f of HEADING_FONTS) expect(heading.text()).toContain(f)
    for (const f of BODY_FONTS) expect(body.text()).toContain(f)
    expect(heading.text()).toContain('ikut tema')
  })

  it('emits an override when a colour changes', async () => {
    const w = mount(DesignControls, { props: { modelValue: {}, themeTokens } })
    const primary = w.find('input[type="color"][data-color="primary"]')
    await primary.setValue('#123456')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({ color: { primary: '#123456' } })
  })

  it('emits an override without the key when a font is set to inherit', async () => {
    const w = mount(DesignControls, { props: { modelValue: { font: { heading: 'Cinzel' } }, themeTokens } })
    const heading = w.find('select[data-font="heading"]')
    await heading.setValue('')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({})
  })

  it('emits an override without the key when the hex text input is cleared', async () => {
    const w = mount(DesignControls, { props: { modelValue: { color: { primary: '#123456' } }, themeTokens } })
    const hex = w.find('input[data-hex="primary"]')
    await hex.setValue('')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({})
  })

  it('reset emits an empty overrides object', async () => {
    const w = mount(DesignControls, { props: { modelValue: { color: { primary: '#000000' } }, themeTokens } })
    await w.find('button[data-reset]').trigger('click')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1][0]).toEqual({})
  })
})

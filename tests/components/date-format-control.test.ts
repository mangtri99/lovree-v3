import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DateFormatControl from '../../app/components/editor/controls/DateFormatControl.vue'
import { nuxtUiStubs } from '../helpers/nuxt-ui-stubs'
import { DATE_FORMATS } from '../../app/utils/date-format'

describe('DateFormatControl', () => {
  it('lists the preset formats', () => {
    const w = mount(DateFormatControl, { props: { modelValue: 'DD MMMM YYYY', label: 'Format' }, global: { stubs: nuxtUiStubs } })
    const html = w.html()
    for (const f of DATE_FORMATS) expect(html).toContain(f.id)
  })
})

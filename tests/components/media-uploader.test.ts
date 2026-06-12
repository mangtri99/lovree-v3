import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MediaUploader from '../../app/components/editor/MediaUploader.vue'

describe('MediaUploader', () => {
  it('renders a file input scoped to the kind', () => {
    const w = mount(MediaUploader, { props: { kind: 'image' } })
    const input = w.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toContain('image')
  })
})

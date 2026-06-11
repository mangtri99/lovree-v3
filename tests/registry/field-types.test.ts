import { describe, it, expect } from 'vitest'
import { fieldTypes, youtubeId } from '../../server/registry/field-types'

describe('field types', () => {
  it('lists generic types', () => {
    expect(Object.keys(fieldTypes)).toEqual(
      expect.arrayContaining(['text', 'longtext', 'image', 'date', 'list', 'url', 'youtube'])
    )
  })
  it('youtubeId accepts a bare id', () => {
    expect(youtubeId.parse('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('youtubeId rejects garbage', () => {
    expect(() => youtubeId.parse('not a valid id!!')).toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { deriveFieldEditors } from '../../app/utils/field-editors'

describe('deriveFieldEditors', () => {
  it('returns ordered editor descriptors for a section type', () => {
    const editors = deriveFieldEditors('hero')
    expect(editors.map((e) => e.key)).toEqual(['title', 'coupleName', 'date', 'dateFormat', 'backgroundImage'])
    expect(editors.find((e) => e.key === 'date')!.type).toBe('date')
  })
  it('returns [] for an unknown type', () => {
    expect(deriveFieldEditors('nope' as any)).toEqual([])
  })
})

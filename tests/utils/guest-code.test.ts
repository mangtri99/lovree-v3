import { describe, it, expect } from 'vitest'
import { generateGuestCode, parseBulkNames } from '../../server/utils/guest-code'

describe('generateGuestCode', () => {
  it('slugifies the name and appends the random suffix', () => {
    expect(generateGuestCode('Budi Santoso', 'x7k2')).toBe('budi-santoso-x7k2')
  })
  it('falls back to "undangan" for an empty/symbol-only name', () => {
    expect(generateGuestCode('', 'x7k2')).toBe('undangan-x7k2')
    expect(generateGuestCode('!!!', 'x7k2')).toBe('undangan-x7k2')
  })
})

describe('parseBulkNames', () => {
  it('splits lines, trims, and drops blanks; preserves order; no dedupe', () => {
    expect(parseBulkNames('Budi\n  \nSiti \n\nBudi')).toEqual(['Budi', 'Siti', 'Budi'])
  })
  it('returns [] for empty/whitespace input', () => {
    expect(parseBulkNames('')).toEqual([])
    expect(parseBulkNames('   \n  ')).toEqual([])
  })
})

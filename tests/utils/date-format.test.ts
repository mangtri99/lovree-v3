import { describe, it, expect } from 'vitest'
import { formatDate, DATE_FORMATS } from '../../app/utils/date-format'

describe('formatDate', () => {
  it('DD MMMM YYYY (default)', () => {
    expect(formatDate('2026-09-01')).toBe('01 September 2026')
    expect(formatDate('2026-09-01', 'DD MMMM YYYY')).toBe('01 September 2026')
  })
  it('dddd, DD MMMM YYYY', () => {
    expect(formatDate('2026-09-01', 'dddd, DD MMMM YYYY')).toBe('Selasa, 01 September 2026')
  })
  it('numeric formats', () => {
    expect(formatDate('2026-09-01', 'DD/MM/YYYY')).toBe('01/09/2026')
    expect(formatDate('2026-09-01', 'DD-MM-YYYY')).toBe('01-09-2026')
  })
  it('accepts a datetime string (uses the date part)', () => {
    expect(formatDate('2026-09-01T08:30')).toBe('01 September 2026')
  })
  it('empty → empty, non-date → unchanged, unknown format → default', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate('besok')).toBe('besok')
    expect(formatDate('2026-09-01', 'WAT')).toBe('01 September 2026')
  })
})

describe('DATE_FORMATS', () => {
  it('has presets incl. the default', () => {
    expect(DATE_FORMATS.length).toBeGreaterThanOrEqual(3)
    expect(DATE_FORMATS.map((f) => f.id)).toContain('DD MMMM YYYY')
  })
})

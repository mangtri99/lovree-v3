import { describe, it, expect } from 'vitest'
import { summarizeRsvps, toGuestbookEntries } from '../../server/utils/rsvp'

const rows = [
  { name: 'A', attendance: 'yes', message: 'Selamat ya!' },
  { name: 'B', attendance: 'no', message: '' },
  { name: 'C', attendance: 'maybe', message: '  Semoga lancar  ' },
  { name: 'D', attendance: 'yes', message: null },
  { name: 'E', attendance: null, message: 'Tanpa status' },
]

describe('summarizeRsvps', () => {
  it('counts each attendance bucket + total; ignores null/unknown', () => {
    expect(summarizeRsvps(rows)).toEqual({ yes: 2, no: 1, maybe: 1, total: 5 })
  })
  it('handles an empty list', () => {
    expect(summarizeRsvps([])).toEqual({ yes: 0, no: 0, maybe: 0, total: 0 })
  })
})

describe('toGuestbookEntries', () => {
  it('keeps only non-empty messages, trims, maps shape, preserves order', () => {
    expect(toGuestbookEntries(rows)).toEqual([
      { name: 'A', message: 'Selamat ya!', attendance: 'yes' },
      { name: 'C', message: 'Semoga lancar', attendance: 'maybe' },
      { name: 'E', message: 'Tanpa status', attendance: null },
    ])
  })
})

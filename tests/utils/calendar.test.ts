import { describe, it, expect } from 'vitest'
import { googleCalendarUrl } from '../../app/utils/calendar'

describe('googleCalendarUrl', () => {
  it('builds an all-day template url with end = next day', () => {
    const u = googleCalendarUrl({ title: 'Pernikahan A & B', date: '2026-09-01', location: 'Bali' })
    expect(u).toContain('https://calendar.google.com/calendar/render?')
    expect(u).toContain('action=TEMPLATE')
    expect(u).toContain('text=Pernikahan%20A%20%26%20B')
    expect(u).toContain('dates=20260901/20260902')
    expect(u).toContain('location=Bali')
  })
  it('falls back to "Simpan Tanggal" for an empty title', () => {
    expect(googleCalendarUrl({ title: '', date: '2026-09-01' })).toContain('text=Simpan%20Tanggal')
  })
  it('omits location/details params when empty', () => {
    const u = googleCalendarUrl({ title: 'X', date: '2026-09-01' })
    expect(u).not.toContain('location=')
    expect(u).not.toContain('details=')
  })
  it('handles month/year wrap for the end date', () => {
    expect(googleCalendarUrl({ title: 'X', date: '2026-12-31' })).toContain('dates=20261231/20270101')
  })
  it('returns empty string for an invalid/empty date', () => {
    expect(googleCalendarUrl({ title: 'X', date: '' })).toBe('')
    expect(googleCalendarUrl({ title: 'X', date: 'oops' })).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { applyGuestSession } from '../../server/utils/session-apply'

const sections = () => [
  { type: 'hero', content: { title: 'X' } },
  { type: 'event', content: { events: [
    { name: 'Akad', timeStart: '08:00', timeEnd: '09:00' },
    { name: 'Resepsi', timeStart: '11:00', timeEnd: '13:00' },
  ] } },
]

describe('applyGuestSession', () => {
  it('overrides only the event whose name matches targetEvent', () => {
    const out = applyGuestSession(sections(), { targetEvent: 'Resepsi', timeStart: '14:00', timeEnd: 'Selesai' })
    const ev = out[1].content.events
    expect(ev[0]).toEqual({ name: 'Akad', timeStart: '08:00', timeEnd: '09:00' })
    expect(ev[1]).toEqual({ name: 'Resepsi', timeStart: '14:00', timeEnd: 'Selesai' })
  })
  it('is identity for a null session', () => {
    const input = sections()
    expect(applyGuestSession(input, null)).toBe(input)
  })
  it('leaves non-event sections and non-matching events untouched, and does not mutate the input', () => {
    const input = sections()
    const out = applyGuestSession(input, { targetEvent: 'Nonexistent', timeStart: '14:00', timeEnd: '' })
    expect(out[0]).toEqual({ type: 'hero', content: { title: 'X' } })
    expect(out[1].content.events[1].timeStart).toBe('11:00')
    expect(input[1].content.events[1].timeStart).toBe('11:00') // original unchanged
  })
})

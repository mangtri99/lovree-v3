import { describe, it, expect } from 'vitest'
import { renderWaTemplate, effectiveWaTemplate, invitationWaVars, formatTimeRange, buildWhatsappUrl, WA_TEMPLATE_DEFAULT } from '../../app/utils/wa-template'

describe('renderWaTemplate', () => {
  it('replaces all five known tokens', () => {
    const out = renderWaTemplate('Yth. {GUEST_NAME} / {COUPLE_NAME} / {DATE} / {TIME} / {URL}', {
      GUEST_NAME: 'Budi', COUPLE_NAME: 'W & D', DATE: '1 Sep 2026', TIME: '09:00 – Selesai', URL: 'https://x/u/a?guest=b',
    })
    expect(out).toBe('Yth. Budi / W & D / 1 Sep 2026 / 09:00 – Selesai / https://x/u/a?guest=b')
  })
  it('renders a missing var as empty and leaves unknown braces intact', () => {
    expect(renderWaTemplate('{GUEST_NAME} {OTHER}', { COUPLE_NAME: 'X' })).toBe(' {OTHER}')
  })
})

describe('effectiveWaTemplate', () => {
  it('falls back to the default when empty/null', () => {
    expect(effectiveWaTemplate('')).toBe(WA_TEMPLATE_DEFAULT)
    expect(effectiveWaTemplate(null)).toBe(WA_TEMPLATE_DEFAULT)
    expect(effectiveWaTemplate('   ')).toBe(WA_TEMPLATE_DEFAULT)
  })
  it('returns the stored value when non-empty', () => {
    expect(effectiveWaTemplate('Halo {GUEST_NAME}')).toBe('Halo {GUEST_NAME}')
  })
  it('default contains the placeholders and the Balinese greeting', () => {
    expect(WA_TEMPLATE_DEFAULT).toContain('{GUEST_NAME}')
    expect(WA_TEMPLATE_DEFAULT).toContain('{URL}')
    expect(WA_TEMPLATE_DEFAULT).toContain('Om Swastyastu')
  })
})

describe('invitationWaVars', () => {
  it('pulls couple name + first-event date/time', () => {
    const sections = [
      { type: 'hero', content: { coupleName: 'Willy & Debby', date: '2026-09-01' } },
      { type: 'event', content: { events: [{ name: 'Resepsi', date: '2026-09-02', timeStart: '11:00', timeEnd: '13:00' }] } },
    ]
    expect(invitationWaVars(sections)).toEqual({ coupleName: 'Willy & Debby', date: '2026-09-02', timeStart: '11:00', timeEnd: '13:00' })
  })
  it('falls back to hero date when there is no event, and tolerates empties', () => {
    const sections = [{ type: 'hero', content: { coupleName: 'A', date: '2026-09-01' } }]
    expect(invitationWaVars(sections)).toEqual({ coupleName: 'A', date: '2026-09-01', timeStart: '', timeEnd: '' })
    expect(invitationWaVars([])).toEqual({ coupleName: '', date: '', timeStart: '', timeEnd: '' })
  })
})

describe('formatTimeRange', () => {
  it('formats start/end pairs', () => {
    expect(formatTimeRange('09:00', '18:00')).toBe('09:00 – 18:00')
    expect(formatTimeRange('09:00', '')).toBe('09:00')
    expect(formatTimeRange('', '')).toBe('')
  })
})

describe('buildWhatsappUrl', () => {
  it('encodes the message', () => {
    const url = buildWhatsappUrl('Halo Budi\nLink: https://x')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.replace('https://wa.me/?text=', ''))).toBe('Halo Budi\nLink: https://x')
  })
})

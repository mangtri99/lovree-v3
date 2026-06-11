import { describe, it, expect } from 'vitest'
import { resolveGuestName } from '../../server/utils/guest'

describe('resolveGuestName', () => {
  it('returns default when no guest param', async () => {
    expect(await resolveGuestName(null, async () => null)).toBe('Tamu Undangan')
    expect(await resolveGuestName('', async () => null)).toBe('Tamu Undangan')
  })
  it('returns the stored name when code matches', async () => {
    expect(await resolveGuestName('budi', async (c) => (c === 'budi' ? 'Budi Santoso' : null))).toBe('Budi Santoso')
  })
  it('falls back to the raw value when no code matches', async () => {
    expect(await resolveGuestName('Pak Andi', async () => null)).toBe('Pak Andi')
  })
})

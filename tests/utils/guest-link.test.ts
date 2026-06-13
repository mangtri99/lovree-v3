import { describe, it, expect } from 'vitest'
import { buildGuestLink } from '../../app/utils/guest-link'

describe('buildGuestLink', () => {
  it('builds the personalized invitation URL', () => {
    expect(buildGuestLink('https://lovree.com', 'elrumi', 'budi-x7k2')).toBe('https://lovree.com/u/elrumi?guest=budi-x7k2')
  })
})

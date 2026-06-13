import { describe, it, expect } from 'vitest'
import { buildGuestLink, buildWhatsappShare } from '../../app/utils/guest-link'

describe('buildGuestLink', () => {
  it('builds the personalized invitation URL', () => {
    expect(buildGuestLink('https://lovree.com', 'elrumi', 'budi-x7k2')).toBe('https://lovree.com/u/elrumi?guest=budi-x7k2')
  })
})

describe('buildWhatsappShare', () => {
  it('returns a wa.me URL containing the encoded name and link', () => {
    const url = buildWhatsappShare('https://lovree.com', 'elrumi', 'budi-x7k2', 'Budi')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    const text = decodeURIComponent(url.replace('https://wa.me/?text=', ''))
    expect(text).toContain('Budi')
    expect(text).toContain('https://lovree.com/u/elrumi?guest=budi-x7k2')
  })
})

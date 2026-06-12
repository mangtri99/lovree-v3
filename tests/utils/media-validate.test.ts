import { describe, it, expect } from 'vitest'
import { validateMediaUpload } from '../../server/utils/media-validate'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const MP3 = Buffer.from([0x49, 0x44, 0x33, 0, 0, 0]) // 'ID3'
const TXT = Buffer.from('hello world')

describe('validateMediaUpload', () => {
  it('accepts a png image under the limit', () => {
    expect(validateMediaUpload({ kind: 'image', size: 1000, bytes: PNG })).toEqual({ ok: true, ext: 'png', contentType: 'image/png' })
  })
  it('accepts a jpg and mp3', () => {
    expect(validateMediaUpload({ kind: 'image', size: 1000, bytes: JPG }).ok).toBe(true)
    expect(validateMediaUpload({ kind: 'audio', size: 1000, bytes: MP3 }).ok).toBe(true)
  })
  it('rejects an oversized image (>2MB) before looking at bytes', () => {
    const r = validateMediaUpload({ kind: 'image', size: 2 * 1024 * 1024 + 1, bytes: PNG })
    expect(r.ok).toBe(false)
  })
  it('rejects oversized audio (>5MB)', () => {
    expect(validateMediaUpload({ kind: 'audio', size: 5 * 1024 * 1024 + 1, bytes: MP3 }).ok).toBe(false)
  })
  it('rejects a file whose magic bytes do not match its declared kind', () => {
    expect(validateMediaUpload({ kind: 'image', size: 10, bytes: TXT }).ok).toBe(false)
    expect(validateMediaUpload({ kind: 'image', size: 10, bytes: MP3 }).ok).toBe(false)
  })
})

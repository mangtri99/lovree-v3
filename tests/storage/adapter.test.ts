import { describe, it, expect, vi } from 'vitest'

const send = vi.fn().mockResolvedValue({})
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () { return { send } }),
  PutObjectCommand: vi.fn(function (i) { return { input: i } }),
  DeleteObjectCommand: vi.fn(function (i) { return { input: i } }),
}))

import { createR2Adapter } from '../../server/storage/r2'

describe('r2 adapter', () => {
  const adapter = createR2Adapter({
    accountId: 'acc', accessKeyId: 'k', secretAccessKey: 's',
    bucket: 'lovree', publicUrl: 'https://media.lovree.com',
  })

  it('put returns key + public url and calls S3', async () => {
    const r = await adapter.put('img/a.jpg', Buffer.from('x'), 'image/jpeg')
    expect(r).toEqual({ key: 'img/a.jpg', url: 'https://media.lovree.com/img/a.jpg' })
    expect(send).toHaveBeenCalled()
  })

  it('url builds a public url', () => {
    expect(adapter.url('audio/song.mp3')).toBe('https://media.lovree.com/audio/song.mp3')
  })
})

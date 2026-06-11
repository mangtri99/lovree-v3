import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../server/utils/password'

describe('password', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('s3cret!')
    expect(await verifyPassword(hash, 's3cret!')).toBe(true)
    expect(await verifyPassword(hash, 'wrong')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { hashUserPassword, verifyUserPassword } from '../../server/utils/password'

describe('password', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashUserPassword('s3cret!')
    expect(await verifyUserPassword(hash, 's3cret!')).toBe(true)
    expect(await verifyUserPassword(hash, 'wrong')).toBe(false)
  })
})

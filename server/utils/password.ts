import { hash, verify } from '@node-rs/argon2'

// Explicit Argon2id cost params (OWASP minimum profile), kept visible and
// stable against library default changes. verify() reads params from the hash.
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 }

export function hashPassword(plain: string) {
  return hash(plain, ARGON2_OPTIONS)
}
export function verifyPassword(stored: string, plain: string) {
  return verify(stored, plain).catch(() => false)
}

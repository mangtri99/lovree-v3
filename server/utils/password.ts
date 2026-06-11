import { hash, verify } from '@node-rs/argon2'

export function hashPassword(plain: string) {
  return hash(plain)
}
export function verifyPassword(stored: string, plain: string) {
  return verify(stored, plain).catch(() => false)
}

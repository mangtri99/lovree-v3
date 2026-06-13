import { slugify } from './slug'

// Deterministic given `rand`; the endpoint supplies a nanoid and retries on a
// unique-constraint collision.
export function generateGuestCode(name: string, rand: string): string {
  return slugify(name, rand)
}

// One name per line, trimmed, blanks dropped, order preserved, no de-duplication.
export function parseBulkNames(text: string): string[] {
  return (text ?? '').split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
}

export function buildGuestLink(origin: string, slug: string, code: string): string {
  return `${origin}/u/${slug}?guest=${encodeURIComponent(code)}`
}

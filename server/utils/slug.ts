export function slugify(input: string, suffix?: string): string {
  const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'undangan'
  return suffix ? `${base}-${suffix}` : base
}

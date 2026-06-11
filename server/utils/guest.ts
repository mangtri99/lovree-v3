export async function resolveGuestName(
  raw: string | null | undefined,
  lookupByCode: (code: string) => Promise<string | null>,
): Promise<string> {
  const value = (raw ?? '').trim()
  if (!value) return 'Tamu Undangan'
  const name = await lookupByCode(value)
  return name ?? value
}

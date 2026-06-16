// Build a Google Calendar "template" URL (no auth) for an all-day event.
// Date-only ISO input; Google's end date is exclusive, so the end is the next day.
export function googleCalendarUrl(input: { title: string; date: string; location?: string; details?: string }): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((input.date ?? '').trim())
  if (!m) return ''
  const [, y, mo, d] = m
  const start = `${y}${mo}${d}`
  const end = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d) + 1))
  const endStr = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`
  const text = (input.title ?? '').trim() || 'Simpan Tanggal'
  const params = ['action=TEMPLATE', `text=${encodeURIComponent(text)}`, `dates=${start}/${endStr}`]
  if (input.details?.trim()) params.push(`details=${encodeURIComponent(input.details)}`)
  if (input.location?.trim()) params.push(`location=${encodeURIComponent(input.location)}`)
  return `https://calendar.google.com/calendar/render?${params.join('&')}`
}

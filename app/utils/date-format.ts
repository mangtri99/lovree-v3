export const DATE_FORMATS: { id: string; example: string }[] = [
  { id: 'DD MMMM YYYY', example: '01 September 2026' },
  { id: 'dddd, DD MMMM YYYY', example: 'Selasa, 01 September 2026' },
  { id: 'DD/MM/YYYY', example: '01/09/2026' },
  { id: 'DD-MM-YYYY', example: '01-09-2026' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// Formats an ISO date (date or datetime) per the preset, id-ID, UTC-anchored to
// avoid timezone off-by-one. Non-date input is returned unchanged; empty -> ''.
export function formatDate(iso: string, format = 'DD MMMM YYYY'): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  const date = new Date(Date.UTC(y, mo - 1, d))
  const monthLong = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(date)
  const weekdayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'UTC' }).format(date)
  switch (format) {
    case 'dddd, DD MMMM YYYY': return `${weekdayLong}, ${pad(d)} ${monthLong} ${y}`
    case 'DD/MM/YYYY': return `${pad(d)}/${pad(mo)}/${y}`
    case 'DD-MM-YYYY': return `${pad(d)}-${pad(mo)}-${y}`
    default: return `${pad(d)} ${monthLong} ${y}`
  }
}

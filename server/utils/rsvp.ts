export interface RsvpRow { name: string; attendance: string | null; message: string | null; createdAt?: any }

export function summarizeRsvps(rsvps: RsvpRow[]): { yes: number; no: number; maybe: number; total: number } {
  const s = { yes: 0, no: 0, maybe: 0, total: rsvps.length }
  for (const r of rsvps) {
    if (r.attendance === 'yes') s.yes++
    else if (r.attendance === 'no') s.no++
    else if (r.attendance === 'maybe') s.maybe++
  }
  return s
}

// Public guestbook entries: only non-empty (trimmed) messages, mapped to the public shape.
export function toGuestbookEntries(rsvps: RsvpRow[]): Array<{ name: string; message: string; attendance: string | null }> {
  return rsvps
    .filter((r) => (r.message ?? '').trim().length > 0)
    .map((r) => ({ name: r.name, message: (r.message ?? '').trim(), attendance: r.attendance ?? null }))
}

export interface GuestSession { targetEvent: string; timeStart: string; timeEnd: string }

// Returns a new sections array (input not mutated). For each `event` section, any
// event item whose name equals the session's targetEvent has its timeStart/timeEnd
// replaced with the session's. A null session returns the same array reference.
export function applyGuestSession(sections: any[], session: GuestSession | null): any[] {
  if (!session) return sections
  return sections.map((s) => {
    if (s.type !== 'event') return s
    const events = (s.content?.events ?? []).map((e: any) =>
      e.name === session.targetEvent ? { ...e, timeStart: session.timeStart, timeEnd: session.timeEnd } : e)
    return { ...s, content: { ...s.content, events } }
  })
}

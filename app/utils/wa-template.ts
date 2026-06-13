export const WA_TEMPLATE_DEFAULT = `Yth. {GUEST_NAME}

The Wedding of💍
{COUPLE_NAME}

Om Swastyastu

Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa/ Tuhan Yang Maha Esa, kami mengundang Bapak/Ibu/Saudara/i pada Resepsi Pawiwahan kami yang dilaksanakan pada :

Hari / Tanggal : {DATE}
Pukul : {TIME}

Untuk lebih lengkapnya bisa dilihat pada link undangan di bawah ini:
{URL}

Demikianlah undangan ini kami sampaikan, atas kehadiran dan doa restu Bapak/Ibu/Saudara/i kami ucapkan terima kasih.

Om Santih Santih Santih Om`

export type WaVars = { GUEST_NAME: string; COUPLE_NAME: string; DATE: string; TIME: string; URL: string }

export function renderWaTemplate(template: string, vars: Partial<WaVars>): string {
  return template.replace(/\{(GUEST_NAME|COUPLE_NAME|DATE|TIME|URL)\}/g, (_, k: string) => (vars as any)[k] ?? '')
}

export function effectiveWaTemplate(stored: string | null | undefined): string {
  return stored && stored.trim().length > 0 ? stored : WA_TEMPLATE_DEFAULT
}

export function invitationWaVars(sections: any[]): { coupleName: string; date: string; timeStart: string; timeEnd: string } {
  const hero = (sections ?? []).find((s) => s.type === 'hero')?.content ?? {}
  const firstEvent = (sections ?? []).find((s) => s.type === 'event')?.content?.events?.[0] ?? {}
  return {
    coupleName: hero.coupleName ?? '',
    date: firstEvent.date || hero.date || '',
    timeStart: firstEvent.timeStart ?? '',
    timeEnd: firstEvent.timeEnd ?? '',
  }
}

export function formatTimeRange(timeStart: string, timeEnd: string): string {
  if (!timeStart && !timeEnd) return ''
  return timeEnd ? `${timeStart} – ${timeEnd}` : timeStart
}

export function buildWhatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

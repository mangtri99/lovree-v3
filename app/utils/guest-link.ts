export function buildGuestLink(origin: string, slug: string, code: string): string {
  return `${origin}/u/${slug}?guest=${encodeURIComponent(code)}`
}

export function buildWhatsappShare(origin: string, slug: string, code: string, name: string): string {
  const link = buildGuestLink(origin, slug, code)
  const msg = `Kepada Yth. ${name},\n\nTanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara kami. Detail & konfirmasi kehadiran:\n${link}\n\nMerupakan suatu kehormatan apabila Bapak/Ibu/Saudara/i berkenan hadir. Terima kasih.`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

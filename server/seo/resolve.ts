export interface SeoOverride { title: string; description: string; ogImage: { mediaId: string; url: string } }
export interface ResolvedSeo { title: string; description: string; ogImage: string; canonical: string }

interface SeoInput {
  type: string
  slug: string
  seo: SeoOverride
  sections: { type: string; content: any }[]
  siteUrl: string
}

const TITLE_PREFIX: Record<string, string> = {
  wedding: 'Undangan Pernikahan',
  wedding_metatah: 'Undangan Pernikahan',
  metatah: 'Undangan Metatah',
  baby_3mo: 'Undangan Tiga Bulanan',
  birthday: 'Undangan Ulang Tahun',
}

// Lead clause per type: [withName, withoutName]
const DESC_LEAD: Record<string, [string, string]> = {
  wedding: ['Kami mengundang Anda ke pernikahan {n}.', 'Kami mengundang Anda ke pernikahan kami.'],
  wedding_metatah: ['Kami mengundang Anda ke pernikahan {n}.', 'Kami mengundang Anda ke pernikahan kami.'],
  metatah: ['Kami mengundang Anda ke upacara Metatah {n}.', 'Kami mengundang Anda ke upacara Metatah kami.'],
  baby_3mo: ['Kami mengundang Anda ke upacara tiga bulanan {n}.', 'Kami mengundang Anda ke upacara tiga bulanan kami.'],
  birthday: ['Kami mengundang Anda ke perayaan ulang tahun {n}.', 'Kami mengundang Anda ke perayaan ulang tahun kami.'],
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// Format a date-only ISO ('YYYY-MM-DD') as 'DD MMMM YYYY' (id-ID). Non-date input -> '' (skipped).
function formatIdDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return ''
  const [, y, mo, d] = m
  const month = MONTHS[Number(mo) - 1]
  if (!month) return ''
  return `${d} ${month} ${y}`
}

function sectionContent(sections: SeoInput['sections'], type: string) {
  return sections.find((s) => s.type === type)?.content
}

export function resolveSeo(input: SeoInput): ResolvedSeo {
  const { type, slug, seo, sections, siteUrl } = input
  const hero = sectionContent(sections, 'hero') ?? {}
  const coupleName: string = (hero.coupleName ?? '').trim()
  const heroDate: string = hero.date ?? ''
  const venue: string = sectionContent(sections, 'event')?.events?.[0]?.venue ?? ''

  // Title
  const prefix = TITLE_PREFIX[type] ?? 'Undangan'
  const autoTitle = coupleName ? `${prefix} ${coupleName}` : prefix
  const title = seo.title?.trim() ? seo.title : autoTitle

  // Description
  const lead = DESC_LEAD[type] ?? ['Kami mengundang Anda ke acara {n}.', 'Kami mengundang Anda ke acara kami.']
  let autoDesc = coupleName ? lead[0].replace('{n}', coupleName) : lead[1]
  const dateStr = formatIdDate(heroDate)
  if (dateStr) autoDesc += ` Tanggal: ${dateStr}.`
  if (venue) autoDesc += ` Lokasi: ${venue}.`
  const description = seo.description?.trim() ? seo.description : autoDesc

  // OG image — always absolute
  const galleryUrl = sectionContent(sections, 'gallery')?.items?.[0]?.url ?? ''
  const ogImage = seo.ogImage?.url?.trim() ? seo.ogImage.url : (galleryUrl || `${siteUrl}/og-default.jpg`)

  return { title, description, ogImage, canonical: `${siteUrl}/u/${slug}` }
}

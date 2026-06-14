import { sectionComponents as base } from './sectionComponents'
import ElegantHero from './themes/elegant/HeroSection.vue'
import ElegantCouple from './themes/elegant/CoupleSection.vue'
import ElegantOpening from './themes/elegant/OpeningSection.vue'
import ElegantClosing from './themes/elegant/ClosingSection.vue'
import ElegantQuote from './themes/elegant/QuoteSection.vue'
import ElegantCustom from './themes/elegant/CustomSection.vue'
import ElegantFooter from './themes/elegant/FooterSection.vue'
import ElegantEvent from './themes/elegant/EventSection.vue'
import ElegantLoveGift from './themes/elegant/LoveGiftSection.vue'
import ElegantInfo from './themes/elegant/InfoSection.vue'
import ElegantCountdown from './themes/elegant/CountdownSection.vue'
import ElegantGallery from './themes/elegant/GallerySection.vue'
import ElegantVideo from './themes/elegant/VideoSection.vue'
import ElegantRsvp from './themes/elegant/RsvpSection.vue'
import ElegantGuestbook from './themes/elegant/GuestbookSection.vue'

// themeKey -> (sectionType -> component). A theme overrides only the sections that
// differ; everything else falls back to the shared `base` pack.
const packs: Record<string, Record<string, any>> = {
  elegant: { hero: ElegantHero, couple: ElegantCouple, opening: ElegantOpening, closing: ElegantClosing, quote: ElegantQuote, custom: ElegantCustom, footer: ElegantFooter, event: ElegantEvent, love_gift: ElegantLoveGift, info: ElegantInfo, countdown: ElegantCountdown, gallery: ElegantGallery, video: ElegantVideo, rsvp: ElegantRsvp, guestbook: ElegantGuestbook },
}

export function resolveSectionComponent(themeKey: string, type: string): any | null {
  return packs[themeKey]?.[type] ?? base[type] ?? null
}

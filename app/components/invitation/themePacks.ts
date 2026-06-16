import { sectionComponents as base } from './sectionComponents'
import CoverModal from './CoverModal.vue'
import ElegantCover from './themes/elegant/CoverModal.vue'
import DarkPradaCover from './themes/dark_prada/CoverModal.vue'
import ElegantHero from './themes/elegant/HeroSection.vue'
import ElegantCouple from './themes/elegant/CoupleSection.vue'
import ElegantMember from './themes/elegant/MemberSection.vue'
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
import ElegantHeroSlideshow from './themes/elegant/HeroSlideshowSection.vue'
import DarkPradaHero from './themes/dark_prada/HeroSection.vue'
import DarkPradaCouple from './themes/dark_prada/CoupleSection.vue'
import DarkPradaMember from './themes/dark_prada/MemberSection.vue'
import DarkPradaOpening from './themes/dark_prada/OpeningSection.vue'
import DarkPradaClosing from './themes/dark_prada/ClosingSection.vue'
import DarkPradaQuote from './themes/dark_prada/QuoteSection.vue'
import DarkPradaCustom from './themes/dark_prada/CustomSection.vue'
import DarkPradaFooter from './themes/dark_prada/FooterSection.vue'
import DarkPradaEvent from './themes/dark_prada/EventSection.vue'
import DarkPradaLoveGift from './themes/dark_prada/LoveGiftSection.vue'
import DarkPradaInfo from './themes/dark_prada/InfoSection.vue'
import DarkPradaCountdown from './themes/dark_prada/CountdownSection.vue'
import DarkPradaGallery from './themes/dark_prada/GallerySection.vue'
import DarkPradaVideo from './themes/dark_prada/VideoSection.vue'
import DarkPradaRsvp from './themes/dark_prada/RsvpSection.vue'
import DarkPradaGuestbook from './themes/dark_prada/GuestbookSection.vue'
import DarkPradaHeroSlideshow from './themes/dark_prada/HeroSlideshowSection.vue'

// themeKey -> (sectionType -> component). A theme overrides only the sections that
// differ; everything else falls back to the shared `base` pack.
const packs: Record<string, Record<string, any>> = {
  elegant: { hero: ElegantHero, couple: ElegantCouple, member: ElegantMember, opening: ElegantOpening, closing: ElegantClosing, quote: ElegantQuote, custom: ElegantCustom, footer: ElegantFooter, event: ElegantEvent, love_gift: ElegantLoveGift, info: ElegantInfo, countdown: ElegantCountdown, gallery: ElegantGallery, video: ElegantVideo, rsvp: ElegantRsvp, guestbook: ElegantGuestbook, hero_slideshow: ElegantHeroSlideshow },
  dark_prada: { hero: DarkPradaHero, couple: DarkPradaCouple, member: DarkPradaMember, opening: DarkPradaOpening, closing: DarkPradaClosing, quote: DarkPradaQuote, custom: DarkPradaCustom, footer: DarkPradaFooter, event: DarkPradaEvent, love_gift: DarkPradaLoveGift, info: DarkPradaInfo, countdown: DarkPradaCountdown, gallery: DarkPradaGallery, video: DarkPradaVideo, rsvp: DarkPradaRsvp, guestbook: DarkPradaGuestbook, hero_slideshow: DarkPradaHeroSlideshow },
}

export function resolveSectionComponent(themeKey: string, type: string): any | null {
  return packs[themeKey]?.[type] ?? base[type] ?? null
}

const covers: Record<string, any> = { elegant: ElegantCover, dark_prada: DarkPradaCover }

export function resolveCover(themeKey: string): any {
  return covers[themeKey] ?? CoverModal
}

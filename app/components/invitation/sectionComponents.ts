import HeroSection from './sections/HeroSection.vue'
import OpeningSection from './sections/OpeningSection.vue'
import CoupleSection from './sections/CoupleSection.vue'
import EventSection from './sections/EventSection.vue'
import CountdownSection from './sections/CountdownSection.vue'
import QuoteSection from './sections/QuoteSection.vue'
import LoveGiftSection from './sections/LoveGiftSection.vue'
import GallerySection from './sections/GallerySection.vue'
import VideoSection from './sections/VideoSection.vue'
import ClosingSection from './sections/ClosingSection.vue'
import InfoSection from './sections/InfoSection.vue'
import RsvpSection from './sections/RsvpSection.vue'
import GuestbookSection from './sections/GuestbookSection.vue'
import FooterSection from './sections/FooterSection.vue'
import CustomSection from './sections/CustomSection.vue'

export const sectionComponents: Record<string, any> = {
  hero: HeroSection, opening: OpeningSection, couple: CoupleSection, event: EventSection,
  countdown: CountdownSection, quote: QuoteSection, love_gift: LoveGiftSection, gallery: GallerySection,
  video: VideoSection, closing: ClosingSection, info: InfoSection, rsvp: RsvpSection, guestbook: GuestbookSection, footer: FooterSection,
  custom: CustomSection,
}

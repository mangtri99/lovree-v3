<script setup lang="ts">
import InvitationRoot from '~/components/invitation/InvitationRoot.vue'

const route = useRoute()
const slug = route.params.slug as string
const rawGuest = route.query.guest
const guestCode = (Array.isArray(rawGuest) ? rawGuest[0] : rawGuest) as string | undefined

const { data, error } = await useFetch(`/api/invitations/${slug}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan' })

// --- SEO ---
const inv = data.value as any

// Extract hero section for couple name & date
const heroSection = inv?.sections?.find((s: any) => s.type === 'hero')
const coupleName = heroSection?.content?.coupleName ?? inv?.title ?? 'Undangan Pernikahan'
const heroDate = heroSection?.content?.date ?? ''

// Extract first event for venue
const eventSection = inv?.sections?.find((s: any) => s.type === 'event')
const firstEvent = eventSection?.content?.events?.[0]
const venue = firstEvent?.venue ?? ''

// Build meta strings
const siteUrl = useRequestURL().origin
const pageUrl = `${siteUrl}/u/${slug}`

const title = coupleName
  ? `Undangan Pernikahan ${coupleName}`
  : 'Undangan Pernikahan'

const description = [
  coupleName ? `Kami mengundang Anda ke pernikahan ${coupleName}.` : 'Kami mengundang Anda ke pernikahan kami.',
  heroDate ? `Tanggal: ${new Date(heroDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.` : '',
  venue ? `Lokasi: ${venue}.` : '',
].filter(Boolean).join(' ')

// Cover / OG image — use gallery first image if available, else fallback
const gallerySection = inv?.sections?.find((s: any) => s.type === 'gallery')
const ogImage = gallerySection?.content?.items?.[0]?.url ?? `${siteUrl}/og-default.jpg`

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: pageUrl,
  ogImage,
  ogType: 'website',
  ogSiteName: 'Lovree',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage,
})

useHead({
  link: [{ rel: 'canonical', href: pageUrl }],
})
</script>

<template>
  <InvitationRoot v-if="data" :data="data as any" :guest-name="(data as any)?.guestName ?? 'Tamu Undangan'" :guest-code="guestCode ?? ''" />
</template>

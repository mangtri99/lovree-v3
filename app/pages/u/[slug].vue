<script setup lang="ts">
import InvitationRoot from '~/components/invitation/InvitationRoot.vue'
import { resolveSeo } from '~~/server/seo/resolve'

const route = useRoute()
const slug = route.params.slug as string
const rawGuest = route.query.guest
const guestCode = (Array.isArray(rawGuest) ? rawGuest[0] : rawGuest) as string | undefined

const { data, error } = await useFetch(`/api/invitations/${slug}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan' })

const inv = data.value as any
const siteUrl = useRequestURL().origin
const seo = resolveSeo({
  type: inv?.type ?? 'wedding',
  slug,
  seo: inv?.seo ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } },
  sections: inv?.sections ?? [],
  siteUrl,
})

useSeoMeta({
  title: seo.title,
  ogTitle: seo.title,
  description: seo.description,
  ogDescription: seo.description,
  ogUrl: seo.canonical,
  ogImage: seo.ogImage,
  ogType: 'website',
  ogSiteName: 'Lovree',
  twitterCard: 'summary_large_image',
  twitterTitle: seo.title,
  twitterDescription: seo.description,
  twitterImage: seo.ogImage,
})
useHead({ link: [{ rel: 'canonical', href: seo.canonical }] })
</script>

<template>
  <InvitationRoot v-if="data" :data="data as any" :guest-name="(data as any)?.guestName ?? 'Tamu Undangan'" :guest-code="guestCode ?? ''" />
</template>

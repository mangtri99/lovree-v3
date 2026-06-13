<script setup lang="ts">
import InvitationRoot from '~/components/invitation/InvitationRoot.vue'

const route = useRoute()
const slug = route.params.slug as string
const rawGuest = route.query.guest
const guestCode = (Array.isArray(rawGuest) ? rawGuest[0] : rawGuest) as string | undefined

const { data, error } = await useFetch(`/api/invitations/${slug}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan' })
</script>

<template>
  <InvitationRoot v-if="data" :data="data as any" :guest-name="(data as any)?.guestName ?? 'Tamu Undangan'" :guest-code="guestCode ?? ''" />
</template>

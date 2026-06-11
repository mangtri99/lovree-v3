<script setup lang="ts">
import InvitationRoot from '~/components/invitation/InvitationRoot.vue'

const route = useRoute()
const slug = route.params.slug as string
const guestName = computed(() => {
  const g = route.query.guest
  return (Array.isArray(g) ? g[0] : g) || 'Tamu Undangan'
})

const { data, error } = await useFetch(`/api/invitations/${slug}`)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan' })
</script>

<template>
  <InvitationRoot v-if="data" :data="data as any" :guest-name="guestName" />
</template>

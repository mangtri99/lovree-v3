<script setup lang="ts">
const { clear } = useUserSession()
const links = [
  { label: 'Undangan', icon: 'i-lucide-mail', to: '/admin/invitations' },
]
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar>
      <template #header>
        <span class="font-semibold">Lovree</span>
      </template>
      <UNavigationMenu orientation="vertical" :items="links" />
      <template #footer>
        <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" label="Keluar" @click="logout" />
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>

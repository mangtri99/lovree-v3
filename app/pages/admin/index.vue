<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
const { user, clear } = useUserSession()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="p-8">
    <h1 class="text-xl font-semibold">Dashboard</h1>
    <p class="mt-2 text-gray-600">Masuk sebagai {{ user?.email }}</p>
    <button class="mt-4 rounded border px-3 py-1" @click="logout">Keluar</button>
  </div>
</template>

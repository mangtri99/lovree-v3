<script setup lang="ts">
const email = ref('')
const password = ref('')
const mode = ref<'login' | 'register'>('login')
const error = ref('')
const { fetch: refreshSession } = useUserSession()

async function submit() {
  error.value = ''
  try {
    await $fetch(`/api/auth/${mode.value}`, { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal'
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm p-8">
    <h1 class="mb-4 text-xl font-semibold">{{ mode === 'login' ? 'Masuk' : 'Daftar' }}</h1>
    <form class="space-y-3" @submit.prevent="submit">
      <input v-model="email" type="email" placeholder="Email" class="w-full rounded border p-2" required />
      <input v-model="password" type="password" placeholder="Password" class="w-full rounded border p-2" required />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="w-full rounded bg-black p-2 text-white">
        {{ mode === 'login' ? 'Masuk' : 'Daftar' }}
      </button>
    </form>
    <a href="/api/auth/google" class="mt-3 block w-full rounded border p-2 text-center">Masuk dengan Google</a>
    <button class="mt-3 text-sm text-gray-500" @click="mode = mode === 'login' ? 'register' : 'login'">
      {{ mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk' }}
    </button>
  </div>
</template>

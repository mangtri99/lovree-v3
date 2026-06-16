<script setup lang="ts">
import { useRsvpForm } from '~/composables/useRsvpForm'
defineProps<{ content: { title: string } }>()
const { name, attendance, message, submitting, done, error, submit } = useRsvpForm()
</script>
<template>
  <section class="px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-center text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <p v-if="done" class="mx-auto mt-4 max-w-md text-center text-sm" style="color: var(--color-primary)">Terima kasih atas konfirmasi & doanya 🙏</p>
    <form v-else class="mx-auto mt-4 max-w-md space-y-3" @submit.prevent="submit">
      <input v-model="name" placeholder="Nama" class="w-full rounded border p-2" style="background: var(--color-secondary); color: var(--color-text)" />
      <select v-model="attendance" class="w-full rounded border p-2" style="background: var(--color-secondary); color: var(--color-text)">
        <option value="yes">Hadir</option>
        <option value="no">Tidak Hadir</option>
        <option value="maybe">Mungkin</option>
      </select>
      <textarea v-model="message" placeholder="Ucapan & Doa" class="w-full rounded border p-2" style="background: var(--color-secondary); color: var(--color-text)" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="submitting" class="w-full rounded p-2 text-white" style="background: var(--color-primary)">{{ submitting ? 'Mengirim…' : 'Kirim' }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { useRsvpForm } from '~/composables/useRsvpForm'
defineProps<{ content: { title: string } }>()
const { name, attendance, message, submitting, done, error, submit } = useRsvpForm()
</script>
<template>
  <section class="px-6 py-16">
    <h2 class="text-center text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="done" class="mx-auto max-w-md text-center text-sm" style="color: var(--color-primary)">Terima kasih atas konfirmasi & doanya 🙏</p>
    <form v-else class="mx-auto mt-2 max-w-md space-y-3" @submit.prevent="submit">
      <input v-model="name" placeholder="Nama" class="w-full rounded border bg-transparent p-2" style="border-color: var(--color-secondary)" />
      <select v-model="attendance" class="w-full rounded border bg-transparent p-2" style="border-color: var(--color-secondary)">
        <option value="yes">Hadir</option>
        <option value="no">Tidak Hadir</option>
        <option value="maybe">Mungkin</option>
      </select>
      <textarea v-model="message" placeholder="Ucapan & Doa" class="w-full rounded border bg-transparent p-2" style="border-color: var(--color-secondary)" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="submitting" class="w-full rounded-full py-2 text-sm uppercase tracking-wider text-white" style="background: var(--color-primary)">{{ submitting ? 'Mengirim…' : 'Kirim' }}</button>
    </form>
  </section>
</template>

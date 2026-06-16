<script setup lang="ts">
import { ref, inject } from 'vue'
defineProps<{ content: { title: string } }>()
const entries = inject<any>('guestbook', ref([]))
const label = (a: string | null) => (a === 'yes' ? 'Hadir' : a === 'no' ? 'Tidak Hadir' : a === 'maybe' ? 'Mungkin' : '')
</script>
<template>
  <section class="px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-center text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <p v-if="!entries.length" class="mt-3 text-center text-sm text-gray-500">Belum ada ucapan.</p>
    <ul class="mx-auto mt-4 max-w-md space-y-3">
      <li v-for="(e, i) in entries" :key="i" class="p-3" style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)">
        <div class="flex items-center gap-2">
          <span class="font-semibold">{{ e.name }}</span>
          <span v-if="label(e.attendance)" class="text-xs" style="color: var(--color-accent)">{{ label(e.attendance) }}</span>
        </div>
        <div class="text-sm">{{ e.message }}</div>
      </li>
    </ul>
  </section>
</template>

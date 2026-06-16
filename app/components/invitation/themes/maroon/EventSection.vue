<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { events: Array<{ name: string; date: string; dateFormat: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-8 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md p-6 text-center" style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)">
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p v-if="e.date" class="mt-3">{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart" class="mt-1">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener noreferrer" class="mt-4 inline-block px-5 py-2 text-sm" style="background: var(--color-primary); color: var(--color-bg); border-radius: var(--radius-md)">Lihat Peta</a>
    </div>
  </section>
</template>

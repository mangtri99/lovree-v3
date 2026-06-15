<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { events: Array<{ name: string; date: string; dateFormat: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-8 px-6 py-12">
    <div v-for="(e, i) in content.events" :key="i" class="rounded-lg p-6 text-center" style="background: var(--color-bg)">
      <h3 class="text-xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p class="mt-2">{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener" class="mt-3 inline-block rounded px-4 py-2 text-white" style="background: var(--color-primary)">Lihat Lokasi</a>
    </div>
  </section>
</template>

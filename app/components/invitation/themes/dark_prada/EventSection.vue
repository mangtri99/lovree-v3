<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { events: Array<{ name: string; date: string; dateFormat: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-8 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md rounded-lg p-6 text-center" style="border: 1px solid var(--color-primary)">
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <p v-if="e.date" class="mt-3 flex items-center justify-center gap-2"><img src="/assets/dark-prada/icon/date.svg" alt="" class="h-4 w-4" />{{ formatDate(e.date, e.dateFormat) }}</p>
      <p v-if="e.timeStart" class="mt-1 flex items-center justify-center gap-2"><img src="/assets/dark-prada/icon/time.svg" alt="" class="h-4 w-4" />{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1 flex items-center justify-center gap-2"><img src="/assets/dark-prada/icon/place.svg" alt="" class="h-4 w-4" />{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center gap-2 rounded border px-4 py-2 text-sm" style="border-color: var(--color-primary); color: var(--color-primary)"><img src="/assets/dark-prada/icon/map.svg" alt="" class="h-4 w-4" />Lihat Peta</a>
    </div>
  </section>
</template>

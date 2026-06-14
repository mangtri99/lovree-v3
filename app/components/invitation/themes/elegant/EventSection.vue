<script setup lang="ts">
defineProps<{ content: { events: Array<{ name: string; date: string; timeStart: string; timeEnd: string; venue: string; mapsUrl: string }> } }>()
</script>
<template>
  <section class="space-y-6 px-6 py-16">
    <div v-for="(e, i) in content.events" :key="i" class="mx-auto max-w-md rounded-lg border p-6 text-center" style="border-color: var(--color-secondary); background: var(--color-bg)">
      <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ e.name }}</h3>
      <div class="mx-auto my-3 h-px w-12" style="background: var(--color-secondary)" />
      <p>{{ e.date }}</p>
      <p v-if="e.timeStart">{{ e.timeStart }}<span v-if="e.timeEnd"> – {{ e.timeEnd }}</span></p>
      <p v-if="e.venue" class="mt-1 text-sm">{{ e.venue }}</p>
      <a v-if="e.mapsUrl" :href="e.mapsUrl" target="_blank" rel="noopener" class="mt-4 inline-block rounded-full border px-5 py-2 text-sm uppercase tracking-wider" style="border-color: var(--color-primary); color: var(--color-primary)">Lihat Lokasi</a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; backgroundImage: { mediaId: string; url: string } } }>()
</script>
<template>
  <section v-if="content.backgroundImage?.url" class="relative bg-cover bg-center py-32 text-center text-white" :style="{ backgroundImage: `url(${content.backgroundImage.url})` }">
    <div class="absolute inset-0 bg-black/45" />
    <div class="relative z-10">
      <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]">{{ formatDate(content.date, content.dateFormat) }}</p>
      <div class="mx-auto my-6 h-px w-16 bg-white/60" />
      <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p class="mt-4 uppercase tracking-[0.25em]">{{ content.title }}</p>
    </div>
  </section>
  <section v-else class="py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ formatDate(content.date, content.dateFormat) }}</p>
    <div class="mx-auto my-6 h-px w-16" style="background: var(--color-secondary)" />
    <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p class="mt-4 uppercase tracking-[0.25em]" style="color: var(--color-secondary)">{{ content.title }}</p>
  </section>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; backgroundImage: { mediaId: string; url: string } } }>()
</script>
<template>
  <section v-if="content.backgroundImage?.url" class="relative bg-cover bg-center py-32 text-center text-white min-h-screen flex flex-col items-center justify-center" :style="{ backgroundImage: `url(${content.backgroundImage.url})` }">
    <div class="absolute inset-0 bg-black/40" />
    <div class="relative z-10">
      <p class="tracking-widest uppercase">{{ content.title }}</p>
      <h1 class="my-4 text-4xl" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
  <section v-else class="py-16 text-center min-h-screen flex flex-col items-center justify-center" style="background: var(--color-bg); color: var(--color-text)">
    <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ content.title }}</p>
    <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
  </section>
</template>

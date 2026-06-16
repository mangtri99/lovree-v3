<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; backgroundImage: { mediaId: string; url: string } } }>()
</script>
<template>
  <section class="relative overflow-hidden px-6 py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img v-if="content.backgroundImage?.url" :src="content.backgroundImage.url" alt="" class="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />
    <img src="/assets/dark-prada/ornament/hero-tl.svg" alt="" class="pointer-events-none absolute left-0 top-0 w-24" />
    <img src="/assets/dark-prada/ornament/hero-tr.svg" alt="" class="pointer-events-none absolute right-0 top-0 w-24" />
    <img src="/assets/dark-prada/ornament/hero-bl.svg" alt="" class="pointer-events-none absolute bottom-0 left-0 w-24" />
    <img src="/assets/dark-prada/ornament/hero-br.svg" alt="" class="pointer-events-none absolute bottom-0 right-0 w-24" />
    <div class="relative z-10">
      <p v-if="content.title" class="tracking-[0.3em] uppercase text-sm">{{ content.title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
</template>

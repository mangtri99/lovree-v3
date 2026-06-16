<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; backgroundImage: { mediaId: string; url: string } } }>()
</script>
<template>
  <section class="relative overflow-hidden px-6 py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img v-if="content.backgroundImage?.url" :src="content.backgroundImage.url" alt="" class="absolute inset-0 h-full w-full object-cover opacity-25" loading="lazy" />
    <div class="relative z-10">
      <p v-if="content.title" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ content.title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
      <div class="flex justify-center" style="color: var(--color-accent)">
        <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true"><line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" /><circle cx="58" cy="8" r="1.5" fill="currentColor" /><path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" /><circle cx="74" cy="8" r="1.5" fill="currentColor" /><line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" /></svg>
      </div>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/date-format'
defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string } }>()
</script>
<template>
  <section class="py-24 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p v-if="content.date" class="text-sm uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ formatDate(content.date, content.dateFormat) }}</p>
    <div class="mx-auto my-6 h-px w-16" style="background: var(--color-secondary)" />
    <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p class="mt-4 uppercase tracking-[0.25em]" style="color: var(--color-secondary)">{{ content.title }}</p>
  </section>
</template>

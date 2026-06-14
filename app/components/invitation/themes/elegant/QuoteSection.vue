<script setup lang="ts">
defineProps<{ content: { text: string; source: string } }>()
</script>
<template>
  <section class="px-6 py-16 text-center" style="background: var(--color-bg)">
    <blockquote class="mx-auto max-w-xl text-2xl italic leading-relaxed" style="font-family: var(--font-heading); color: var(--color-primary)">&ldquo;{{ content.text }}&rdquo;</blockquote>
    <div class="mx-auto my-4 h-px w-12" style="background: var(--color-secondary)" />
    <p v-if="content.source" class="text-sm uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ content.source }}</p>
  </section>
</template>

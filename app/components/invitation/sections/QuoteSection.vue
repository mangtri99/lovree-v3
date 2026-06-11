<script setup lang="ts">
defineProps<{ content: { text: string; source: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center" style="background: var(--color-bg)">
    <blockquote class="mx-auto max-w-xl text-lg italic" style="font-family: var(--font-heading)">"{{ content.text }}"</blockquote>
    <p v-if="content.source" class="mt-2 text-sm">— {{ content.source }}</p>
  </section>
</template>

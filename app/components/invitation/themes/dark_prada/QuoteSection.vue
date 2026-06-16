<script setup lang="ts">
defineProps<{ content: { text: string; source: string } }>()
</script>
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <blockquote class="mx-auto max-w-xl text-lg italic" style="font-family: var(--font-heading); color: var(--color-primary)">"{{ content.text }}"</blockquote>
    <p v-if="content.source" class="mt-2 text-sm">— {{ content.source }}</p>
  </section>
</template>

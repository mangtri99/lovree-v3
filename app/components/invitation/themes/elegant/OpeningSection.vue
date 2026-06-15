<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-3xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
    <p class="mx-auto max-w-xl whitespace-pre-line leading-relaxed">{{ content.body }}</p>
  </section>
</template>

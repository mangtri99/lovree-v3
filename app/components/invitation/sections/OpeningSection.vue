<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 class="text-2xl" style="font-family: var(--font-heading)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-3 max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>

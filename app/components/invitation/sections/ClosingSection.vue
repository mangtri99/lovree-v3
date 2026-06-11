<script setup lang="ts">
defineProps<{ content: { body: string } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <p class="mx-auto max-w-xl whitespace-pre-line">{{ content.body }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{ content: { title: string; coupleName: string; date: string } }>()
</script>
<template>
  <section class="py-16 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ content.title }}</p>
    <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.coupleName }}</h1>
    <p v-if="content.date">{{ content.date }}</p>
  </section>
</template>

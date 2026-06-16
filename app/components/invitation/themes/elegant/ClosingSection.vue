<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>();
</script>
<template>
  <section class="px-6 py-16 text-center" style="color: var(--color-text)">
    <p class="mx-auto max-w-xl whitespace-pre-line italic leading-relaxed">
      {{ content.body }}
    </p>
    <div
      class="mx-auto my-5 h-px w-16"
      style="background: var(--color-secondary)"
    />
    <h2
      v-if="content.greeting"
      class="text-2xl italic"
      style="font-family: var(--font-heading); color: var(--color-primary)"
    >
      {{ content.greeting }}
    </h2>
  </section>
</template>

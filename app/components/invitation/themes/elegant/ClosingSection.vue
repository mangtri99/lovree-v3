<script setup lang="ts">
defineProps<{ content: { body: string } }>();
</script>
<template>
  <section
    class="px-6 py-16 text-center"
    style="background: var(--color-bg); color: var(--color-text)"
  >
    <div
      class="mx-auto mb-5 h-px w-16"
      style="background: var(--color-secondary)"
    />
    <p class="mx-auto max-w-xl whitespace-pre-line italic leading-relaxed">
      {{ content.body }}
    </p>
  </section>
</template>

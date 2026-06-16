<script setup lang="ts">
defineProps<{ content: { greeting: string; body: string } }>()
</script>
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.greeting }}</h2>
    <p class="mx-auto mt-4 max-w-xl whitespace-pre-line">{{ content.body }}</p>
    <div class="mt-8 flex justify-center" style="color: var(--color-accent)">
      <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true"><line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" /><circle cx="58" cy="8" r="1.5" fill="currentColor" /><path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" /><circle cx="74" cy="8" r="1.5" fill="currentColor" /><line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" /></svg>
    </div>
  </section>
</template>

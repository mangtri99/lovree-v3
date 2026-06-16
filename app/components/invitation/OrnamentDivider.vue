<script setup lang="ts">
defineOptions({ name: 'OrnamentDivider' })
defineProps<{ variant: string }>()
</script>
<template>
  <div v-if="variant === 'line'" class="mx-auto my-10 h-px w-16" style="background: var(--color-secondary)" />
  <div v-else-if="variant === 'flourish'" class="my-10 flex justify-center" style="color: var(--color-primary)">
    <svg width="132" height="16" viewBox="0 0 132 16" fill="none" aria-hidden="true">
      <line x1="6" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1" />
      <circle cx="58" cy="8" r="1.5" fill="currentColor" />
      <path d="M66 1 L72 8 L66 15 L60 8 Z" fill="currentColor" />
      <circle cx="74" cy="8" r="1.5" fill="currentColor" />
      <line x1="80" y1="8" x2="126" y2="8" stroke="currentColor" stroke-width="1" />
    </svg>
  </div>
</template>

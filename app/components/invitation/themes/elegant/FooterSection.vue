<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <footer class="px-6 py-12 text-center text-sm uppercase tracking-[0.25em]" style="background: var(--color-primary); color: white">
    {{ content.text || 'Made with Lovree' }}
  </footer>
</template>

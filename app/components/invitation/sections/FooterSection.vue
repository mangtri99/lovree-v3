<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <footer class="px-6 py-10 text-center text-sm" style="background: var(--color-primary); color: white">
    {{ content.text || 'Made with Lovree' }}
  </footer>
</template>

<script setup lang="ts">
defineProps<{ state: 'idle' | 'saving' | 'saved' | 'error' }>()
const text: Record<string, string> = { idle: '', saving: 'Menyimpan…', saved: 'Tersimpan', error: 'Gagal menyimpan' }
</script>
<template>
  <span class="text-xs" :class="state === 'error' ? 'text-red-600' : 'text-gray-500'">{{ text[state] }}</span>
</template>

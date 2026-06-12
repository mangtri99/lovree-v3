<script setup lang="ts">
defineProps<{ kind: 'image' | 'audio' }>()
defineEmits<{ uploaded: [string] }>()
</script>
<template>
  <div><!-- media uploader placeholder, implemented in P2a-16 --></div>
</template>

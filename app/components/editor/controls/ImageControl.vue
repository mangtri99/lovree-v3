<script setup lang="ts">
import MediaUploader from '../MediaUploader.vue'
defineProps<{ modelValue: string | null; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
function onUploaded(id: string) { emit('update:modelValue', id) }
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <p v-if="modelValue" class="mb-1 text-xs text-gray-500">media: {{ modelValue }}</p>
    <MediaUploader kind="image" @uploaded="onUploaded" />
  </div>
</template>

<script setup lang="ts">
import MediaUploader from '../MediaUploader.vue'
type ImageValue = { mediaId: string; url: string }
const props = defineProps<{ modelValue: ImageValue | null; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [ImageValue] }>()
function onUploaded(media: { id: string; url: string }) {
  emit('update:modelValue', { mediaId: media.id, url: media.url })
}
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-muted">{{ label }}</span>
    <img v-if="modelValue?.url" :src="modelValue.url" alt="" class="mb-2 h-20 w-20 rounded object-cover" />
    <MediaUploader kind="image" @uploaded="onUploaded" />
  </div>
</template>

<script setup lang="ts">
import MediaUploader from './MediaUploader.vue'
const props = defineProps<{ musicUrl: string | null; onSetMusic: (mediaId: string | null) => Promise<void> }>()
const emit = defineEmits<{ 'update:musicUrl': [string | null] }>()

async function onUploaded(media: { id: string; url: string }) {
  await props.onSetMusic(media.id)
  emit('update:musicUrl', media.url)
}
async function remove() {
  await props.onSetMusic(null)
  emit('update:musicUrl', null)
}
</script>
<template>
  <div class="rounded border border-default bg-default p-3 text-sm">
    <h3 class="mb-2 font-medium text-highlighted">Pengaturan Undangan</h3>
    <span class="mb-1 block text-muted">Musik</span>
    <div v-if="musicUrl" class="mb-2 flex items-center gap-2">
      <audio :src="musicUrl" controls class="h-8" />
      <button type="button" class="text-xs text-red-600" @click="remove">Hapus musik</button>
    </div>
    <MediaUploader kind="audio" @uploaded="onUploaded" />
  </div>
</template>

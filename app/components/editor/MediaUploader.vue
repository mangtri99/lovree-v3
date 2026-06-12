<script setup lang="ts">
import { ref, inject } from 'vue'
const props = defineProps<{ kind: 'image' | 'audio' }>()
const emit = defineEmits<{ uploaded: [{ id: string; url: string }] }>()
const busy = ref(false)
const error = ref('')
const invitationId = inject<string>('invitationId', '')

const accept = props.kind === 'image' ? 'image/png,image/jpeg,image/webp' : 'audio/mpeg'

async function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const form = new FormData()
    form.append('invitationId', invitationId)
    form.append('kind', props.kind)
    form.append('file', file)
    const res = await $fetch<{ id: string; url: string }>('/api/admin/media', { method: 'POST', body: form })
    emit('uploaded', { id: res.id, url: res.url })
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Upload gagal'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div>
    <input type="file" :accept="accept" :disabled="busy" @change="onChange" />
    <span v-if="busy" class="text-xs text-muted">Mengunggah…</span>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>

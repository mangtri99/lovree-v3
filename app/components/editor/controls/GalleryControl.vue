<script setup lang="ts">
import { ref, inject } from 'vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ modelValue: Img[]; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [Img[]] }>()
const invitationId = inject<string>('invitationId', '')
const busy = ref(false)
const error = ref('')

function update(items: Img[]) { emit('update:modelValue', items) }
function removeAt(i: number) { const a = [...props.modelValue]; a.splice(i, 1); update(a) }
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= props.modelValue.length) return
  const a = [...props.modelValue]
  ;[a[i], a[j]] = [a[j], a[i]]
  update(a)
}
async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  busy.value = true; error.value = ''
  const added: Img[] = []
  for (const file of files) {
    try {
      const form = new FormData()
      form.append('invitationId', invitationId)
      form.append('kind', 'image')
      form.append('file', file)
      const res = await $fetch<{ id: string; url: string }>('/api/admin/media', { method: 'POST', body: form })
      added.push({ mediaId: res.id, url: res.url })
    } catch (err: any) { error.value = err?.data?.message ?? 'Upload gagal' }
  }
  if (added.length) update([...(props.modelValue ?? []), ...added])
  ;(e.target as HTMLInputElement).value = ''
  busy.value = false
}
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-gray-600">{{ label }}</span>
    <div v-if="modelValue.length" class="mb-2 grid grid-cols-3 gap-2">
      <div v-for="(img, i) in modelValue" :key="i" class="relative">
        <img :src="img.url" alt="" class="h-20 w-full rounded object-cover" />
        <div class="absolute right-1 top-1 flex gap-1">
          <button type="button" data-act="up" class="rounded bg-white/80 px-1 text-xs" :disabled="i === 0" @click="move(i, -1)">↑</button>
          <button type="button" data-act="down" class="rounded bg-white/80 px-1 text-xs" :disabled="i === modelValue.length - 1" @click="move(i, 1)">↓</button>
          <button type="button" data-act="remove" class="rounded bg-white/80 px-1 text-xs text-red-600" @click="removeAt(i)">×</button>
        </div>
      </div>
    </div>
    <input type="file" accept="image/png,image/jpeg,image/webp" multiple :disabled="busy" @change="onFiles" />
    <span v-if="busy" class="text-xs text-gray-500">Mengunggah…</span>
    <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch<any>('/api/admin/music')
const tracks = computed<any[]>(() => (data.value as any)?.tracks ?? [])

const name = ref('')
const uploading = ref(false)
const error = ref('')

async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true; error.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    if (name.value.trim()) form.append('name', name.value.trim())
    await $fetch('/api/admin/music', { method: 'POST', body: form })
    name.value = ''
    ;(e.target as HTMLInputElement).value = ''
    await refresh()
  } catch (err: any) { error.value = err?.data?.message ?? 'Upload gagal' } finally { uploading.value = false }
}
async function rename(t: any) {
  const newName = (prompt('Nama baru:', t.name) ?? '').trim()
  if (!newName || newName === t.name) return
  await $fetch(`/api/admin/music/${t.id}`, { method: 'PATCH', body: { name: newName } })
  await refresh()
}
async function del(id: string) {
  await $fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="music">
    <template #header><UDashboardNavbar title="Musik" /></template>
    <template #body>
      <div class="space-y-6">
        <UCard>
          <h2 class="mb-3 font-medium">Tambah Musik</h2>
          <div class="flex flex-wrap items-end gap-2">
            <UInput v-model="name" placeholder="Nama lagu (opsional)" />
            <input type="file" accept="audio/mpeg" :disabled="uploading" @change="onUpload" >
            <span v-if="uploading" class="text-xs text-muted">Mengunggah…</span>
          </div>
          <p v-if="error" class="mt-2 text-sm text-error">{{ error }}</p>
        </UCard>

        <UCard>
          <h2 class="mb-3 font-medium">Daftar Musik ({{ tracks.length }})</h2>
          <div v-if="!tracks.length" class="text-sm text-muted">Belum ada musik.</div>
          <ul v-else class="space-y-2">
            <li v-for="t in tracks" :key="t.id" class="flex items-center gap-3 text-sm">
              <span class="min-w-32 font-medium">{{ t.name }}</span>
              <audio :src="t.url" controls class="h-8" />
              <UButton class="ml-auto" size="xs" variant="ghost" label="Ganti nama" @click="rename(t)" />
              <UButton size="xs" color="error" variant="ghost" label="Hapus" @click="del(t.id)" />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

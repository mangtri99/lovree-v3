<script setup lang="ts">
import { ref } from 'vue'
import ThemeEditor from '~/components/theme/ThemeEditor.vue'
import ThemePreviewCard from '~/components/theme/ThemePreviewCard.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch<any[]>('/api/admin/themes')
const open = ref(false)
const editing = ref<any | null>(null)
const error = ref('')

function add() { editing.value = null; error.value = ''; open.value = true }
function edit(t: any) { editing.value = t; error.value = ''; open.value = true }

async function onSubmit(payload: { name: string; key: string; tokens: any }) {
  error.value = ''
  try {
    if (editing.value?.id) await $fetch(`/api/admin/themes/${editing.value.id}`, { method: 'PATCH', body: payload })
    else await $fetch('/api/admin/themes', { method: 'POST', body: payload })
    open.value = false
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal menyimpan'
  }
}

async function remove(t: any) {
  if (!confirm(`Hapus tema "${t.name}"?`)) return
  try { await $fetch(`/api/admin/themes/${t.id}`, { method: 'DELETE' }); await refresh() }
  catch (e: any) { alert(e?.data?.message ?? 'Gagal menghapus') }
}
</script>

<template>
  <UDashboardPanel id="themes">
    <template #header>
      <UDashboardNavbar title="Tema">
        <template #right><UButton icon="i-lucide-plus" label="Tema Baru" @click="add" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="t in (data ?? [])" :key="t.id" class="space-y-2">
          <ThemePreviewCard :theme="t" :selected="false" />
          <div class="flex items-center justify-between px-1">
            <span v-if="t.builtin" class="rounded bg-elevated px-2 py-0.5 text-xs text-muted">Bawaan</span>
            <span v-else class="flex gap-2">
              <UButton size="xs" variant="ghost" icon="i-lucide-pencil" @click="edit(t)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash" @click="remove(t)" />
            </span>
          </div>
        </div>
      </div>
      <UModal v-model:open="open" :title="editing ? 'Edit Tema' : 'Tema Baru'">
        <template #body>
          <p v-if="error" class="mb-2 text-sm text-error">{{ error }}</p>
          <ThemeEditor :theme="editing" :on-submit="onSubmit" />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

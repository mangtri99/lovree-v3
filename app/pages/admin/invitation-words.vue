<script setup lang="ts">
import { ref, computed } from 'vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch<any>('/api/admin/invitation-words')
const words = computed<any[]>(() => (data.value as any)?.words ?? [])
const typeItems = [
  { label: 'Pernikahan', value: 'wedding' },
  { label: 'Pernikahan + Metatah', value: 'wedding_metatah' },
  { label: 'Metatah', value: 'metatah' },
  { label: '3 Bulanan', value: 'baby_3mo' },
  { label: 'Ulang Tahun', value: 'birthday' },
]

const blank = () => ({ id: '', name: '', type: 'wedding', openingGreeting: '', openingBody: '', closingGreeting: '', closingBody: '', quote: '', quoteSource: '' })
const open = ref(false)
const form = ref<any>(blank())
const saving = ref(false)

function add() { form.value = blank(); open.value = true }
function edit(w: any) { form.value = { ...w }; open.value = true }
async function save() {
  saving.value = true
  try {
    const { id, ...payload } = form.value
    if (id) await $fetch(`/api/admin/invitation-words/${id}`, { method: 'PATCH', body: payload })
    else await $fetch('/api/admin/invitation-words', { method: 'POST', body: payload })
    open.value = false
    await refresh()
  } finally { saving.value = false }
}
async function del(id: string) {
  await $fetch(`/api/admin/invitation-words/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="invitation-words">
    <template #header>
      <UDashboardNavbar title="Invitation Word">
        <template #right><UButton icon="i-lucide-plus" label="Tambah" @click="add" /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-2">
        <div v-if="!words.length" class="text-sm text-muted">Belum ada kata-kata. Tambah satu untuk dipakai saat buat undangan.</div>
        <UCard v-for="w in words" :key="w.id">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ w.name }}</span>
            <UBadge variant="subtle" :label="w.type" />
            <UButton class="ml-auto" size="xs" variant="ghost" label="Edit" @click="edit(w)" />
            <UButton size="xs" color="error" variant="ghost" label="Hapus" @click="del(w.id)" />
          </div>
        </UCard>
      </div>

      <UModal v-model:open="open" :title="form.id ? 'Edit Kata-kata' : 'Tambah Kata-kata'">
        <template #body>
          <div class="space-y-3">
            <UFormField label="Judul" required><UInput v-model="form.name" class="w-full" /></UFormField>
            <UFormField label="Tipe Undangan" required><USelect v-model="form.type" :items="typeItems" class="w-full" /></UFormField>
            <UFormField label="Salam Pembuka"><UInput v-model="form.openingGreeting" class="w-full" /></UFormField>
            <UFormField label="Isi Pembuka"><UTextarea v-model="form.openingBody" :rows="3" class="w-full" /></UFormField>
            <UFormField label="Isi Penutup"><UTextarea v-model="form.closingBody" :rows="3" class="w-full" /></UFormField>
            <UFormField label="Salam Penutup"><UInput v-model="form.closingGreeting" class="w-full" /></UFormField>
            <UFormField label="Quote"><UTextarea v-model="form.quote" :rows="2" class="w-full" /></UFormField>
            <UFormField label="Sumber Quote"><UInput v-model="form.quoteSource" class="w-full" /></UFormField>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" label="Batal" @click="open = false" />
              <UButton label="Simpan" :loading="saving" :disabled="!form.name.trim()" @click="save" />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

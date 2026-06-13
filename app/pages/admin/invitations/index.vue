<script setup lang="ts">
import { ref } from 'vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: list } = await useFetch('/api/admin/invitations')
const title = ref('')
const type = ref<'wedding' | 'metatah' | 'wedding_metatah' | 'baby_3mo' | 'birthday'>('wedding')
const typeItems = [
  { label: 'Pernikahan', value: 'wedding' },
  { label: 'Pernikahan + Metatah', value: 'wedding_metatah' },
  { label: 'Metatah', value: 'metatah' },
  { label: '3 Bulanan', value: 'baby_3mo' },
  { label: 'Ulang Tahun', value: 'birthday' },
]
const creating = ref(false)
const error = ref('')

async function create() {
  error.value = ''
  creating.value = true
  try {
    const inv = await $fetch<{ id: string }>('/api/admin/invitations', { method: 'POST', body: { title: title.value, type: type.value } })
    await navigateTo(`/admin/invitations/${inv.id}/edit`)
  } catch (e: any) { error.value = e?.data?.message ?? 'Gagal' } finally { creating.value = false }
}
</script>

<template>
  <UDashboardPanel id="invitations">
    <template #header>
      <UDashboardNavbar title="Undangan Saya" />
    </template>
    <template #body>
      <UCard class="mb-6">
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="create">
          <UFormField label="Judul" class="flex-1">
            <UInput v-model="title" placeholder="Judul undangan" required class="w-full" />
          </UFormField>
          <UFormField label="Tipe">
            <USelect v-model="type" :items="typeItems" />
          </UFormField>
          <UButton type="submit" label="Buat" :loading="creating" />
        </form>
        <p v-if="error" class="mt-2 text-sm text-error">{{ error }}</p>
      </UCard>

      <div class="space-y-2">
        <UCard v-for="inv in (list as any[])" :key="inv.id">
          <div class="flex items-center gap-2">
            <span>{{ inv.slug }}</span>
            <UBadge :color="inv.status === 'published' ? 'success' : 'neutral'" variant="subtle" :label="inv.status" />
            <UButton
              v-if="inv.status === 'published'"
              class="ml-auto"
              variant="link"
              icon="i-lucide-external-link"
              :to="`/u/${inv.slug}`"
              target="_blank"
              label="View" />
            <UButton :class="inv.status === 'published' ? '' : 'ml-auto'" variant="link" :to="`/admin/invitations/${inv.id}/edit`" label="Edit" />
            <UButton variant="link" :to="`/admin/invitations/${inv.id}/guests`" label="Tamu" />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats } = await useFetch<any>('/api/admin/stats')
const { data: list } = await useFetch<any>('/api/admin/invitations')

const recent = computed<any[]>(() =>
  [...(((list.value as any[]) ?? []))]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5))

const cards = computed(() => [
  { label: 'Undangan', value: (stats.value as any)?.invitations ?? 0, icon: 'i-lucide-mail' },
  { label: 'Published', value: (stats.value as any)?.published ?? 0, icon: 'i-lucide-globe' },
  { label: 'Draft', value: (stats.value as any)?.drafts ?? 0, icon: 'i-lucide-pencil' },
  { label: 'Tamu', value: (stats.value as any)?.guests ?? 0, icon: 'i-lucide-users' },
  { label: 'RSVP', value: (stats.value as any)?.rsvps ?? 0, icon: 'i-lucide-circle-check' },
])
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #right>
          <UButton to="/admin/invitations" icon="i-lucide-plus" label="Buat Undangan" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <UCard v-for="c in cards" :key="c.label">
            <div class="flex items-center gap-3">
              <UIcon :name="c.icon" class="size-5 text-gray-400" />
              <div>
                <div class="text-xs text-gray-500">{{ c.label }}</div>
                <div class="text-2xl font-semibold">{{ c.value }}</div>
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <div class="mb-3 flex items-center">
            <h2 class="font-medium">Undangan Terbaru</h2>
            <UButton class="ml-auto" variant="link" to="/admin/invitations" label="Lihat semua" />
          </div>
          <div v-if="!recent.length" class="text-sm text-gray-500">Belum ada undangan.</div>
          <ul v-else class="space-y-2">
            <li v-for="inv in recent" :key="inv.id" class="flex items-center gap-2 text-sm">
              <span>{{ inv.slug }}</span>
              <UBadge :color="inv.status === 'published' ? 'success' : 'neutral'" variant="subtle" :label="inv.status" />
              <UButton class="ml-auto" variant="link" :to="`/admin/invitations/${inv.id}/edit`" label="Edit" />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

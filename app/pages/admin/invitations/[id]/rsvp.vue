<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string

const { data, refresh } = await useFetch<any>(`/api/admin/invitations/${id}/rsvps`)
const rows = computed<any[]>(() => (data.value as any)?.rsvps ?? [])
const summary = computed<any>(() => (data.value as any)?.summary ?? { yes: 0, no: 0, maybe: 0, total: 0 })
const label = (a: string | null) => (a === 'yes' ? 'Hadir' : a === 'no' ? 'Tidak Hadir' : a === 'maybe' ? 'Mungkin' : '—')

async function del(rid: string) {
  await $fetch(`/api/admin/invitations/${id}/rsvps/${rid}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UDashboardPanel id="rsvp">
    <template #header>
      <UDashboardNavbar title="Rekap RSVP">
        <template #right>
          <UButton variant="link" :to="`/admin/invitations/${id}/guests`" label="Tamu" />
          <UButton variant="link" :to="`/admin/invitations/${id}/edit`" label="Editor" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UCard><div class="text-xs text-gray-500">Hadir</div><div class="text-2xl font-semibold">{{ summary.yes }}</div></UCard>
          <UCard><div class="text-xs text-gray-500">Tidak Hadir</div><div class="text-2xl font-semibold">{{ summary.no }}</div></UCard>
          <UCard><div class="text-xs text-gray-500">Mungkin</div><div class="text-2xl font-semibold">{{ summary.maybe }}</div></UCard>
          <UCard><div class="text-xs text-gray-500">Total</div><div class="text-2xl font-semibold">{{ summary.total }}</div></UCard>
        </div>

        <UCard>
          <h2 class="mb-3 font-medium">Respons ({{ rows.length }})</h2>
          <div v-if="!rows.length" class="text-sm text-gray-500">Belum ada respons.</div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500"><th class="py-1">Nama</th><th>Kehadiran</th><th>Ucapan</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="border-t align-top">
                <td class="py-1">{{ r.name }}</td>
                <td>{{ label(r.attendance) }}</td>
                <td class="whitespace-pre-line">{{ r.message || '—' }}</td>
                <td class="py-1 text-right"><UButton size="xs" color="error" variant="ghost" label="Hapus" @click="del(r.id)" /></td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

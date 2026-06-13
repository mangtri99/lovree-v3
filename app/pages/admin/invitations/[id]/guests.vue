<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildGuestLink, buildWhatsappShare } from '~/utils/guest-link'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string

const { data: inv } = await useFetch<any>(`/api/admin/invitations/${id}`)
if (!inv.value) throw createError({ statusCode: 404, statusMessage: 'Tidak ditemukan' })
const slug = computed(() => (inv.value as any)?.slug ?? '')

const eventNames = computed<string[]>(() => {
  const secs = ((inv.value as any)?.draftDocument?.sections ?? []) as any[]
  const names = secs.filter((s) => s.type === 'event').flatMap((s) => s.content?.events ?? []).map((e: any) => e.name).filter((n: string) => !!n)
  return [...new Set(names)]
})

const { data: sessionsData, refresh: refreshSessions } = await useFetch<any>(`/api/admin/invitations/${id}/sessions`)
const { data: guestsData, refresh: refreshGuests } = await useFetch<any>(`/api/admin/invitations/${id}/guests`)
const sessions = computed<any[]>(() => (sessionsData.value as any)?.sessions ?? [])
const guests = computed<any[]>(() => (guestsData.value as any)?.guests ?? [])
const sessionLabel = (s: any) => `${s.targetEvent} ${s.timeStart}${s.timeEnd ? '–' + s.timeEnd : ''}`
const sessionById = (sid: string | null) => sessions.value.find((s) => s.id === sid)
const sessionOptions = computed(() => [{ label: '— tanpa sesi —', value: '' }, ...sessions.value.map((s) => ({ label: sessionLabel(s), value: s.id }))])

const sTarget = ref('')
const sStart = ref('')
const sEnd = ref('')
async function addSession() {
  if (!sTarget.value) return
  await $fetch(`/api/admin/invitations/${id}/sessions`, { method: 'POST', body: { targetEvent: sTarget.value, timeStart: sStart.value, timeEnd: sEnd.value } })
  sTarget.value = ''; sStart.value = ''; sEnd.value = ''
  await refreshSessions()
}
async function delSession(sid: string) {
  await $fetch(`/api/admin/invitations/${id}/sessions/${sid}`, { method: 'DELETE' })
  await Promise.all([refreshSessions(), refreshGuests()])
}

const gName = ref('')
const gGroup = ref('')
const gSession = ref<string>('')
async function addGuest() {
  if (!gName.value.trim()) return
  await $fetch(`/api/admin/invitations/${id}/guests`, { method: 'POST', body: { names: [gName.value.trim()], groupLabel: gGroup.value || undefined, sessionId: gSession.value || null } })
  gName.value = ''
  await refreshGuests()
}
const bulkText = ref('')
const bulkGroup = ref('')
const bulkSession = ref<string>('')
const bulkNames = computed(() => bulkText.value.split('\n').map((s) => s.trim()).filter(Boolean))
async function addBulk() {
  if (!bulkNames.value.length) return
  await $fetch(`/api/admin/invitations/${id}/guests`, { method: 'POST', body: { names: bulkNames.value, groupLabel: bulkGroup.value || undefined, sessionId: bulkSession.value || null } })
  bulkText.value = ''
  await refreshGuests()
}
async function delGuest(gid: string) {
  await $fetch(`/api/admin/invitations/${id}/guests/${gid}`, { method: 'DELETE' })
  await refreshGuests()
}

const copied = ref<string | null>(null)
async function copyLink(code: string) {
  const url = buildGuestLink(window.location.origin, slug.value, code)
  await navigator.clipboard.writeText(url)
  copied.value = code
  setTimeout(() => { if (copied.value === code) copied.value = null }, 1500)
}
function shareWa(code: string, name: string) {
  window.open(buildWhatsappShare(window.location.origin, slug.value, code, name), '_blank')
}
</script>

<template>
  <UDashboardPanel id="guests">
    <template #header>
      <UDashboardNavbar title="Kelola Tamu">
        <template #right>
          <UButton variant="link" :to="`/admin/invitations/${id}/edit`" label="Editor" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-6">
        <UCard>
          <h2 class="mb-3 font-medium">Sesi Waktu</h2>
          <div v-if="!eventNames.length" class="mb-3 rounded border border-dashed p-3 text-sm text-gray-500">
            Belum ada acara. Tambah bagian "Detail Acara" di editor dulu untuk membuat sesi.
          </div>
          <div v-else class="mb-3 flex flex-wrap items-end gap-2">
            <USelect v-model="sTarget" :items="eventNames" placeholder="Acara" />
            <UInput v-model="sStart" placeholder="Mulai (mis. 09:00)" />
            <UInput v-model="sEnd" placeholder="Selesai (mis. 18:00 / Selesai)" />
            <UButton label="Tambah Sesi" @click="addSession" />
          </div>
          <ul class="space-y-1 text-sm">
            <li v-for="s in sessions" :key="s.id" class="flex items-center gap-2">
              <span>{{ sessionLabel(s) }}</span>
              <UButton class="ml-auto" size="xs" color="error" variant="ghost" label="Hapus" @click="delSession(s.id)" />
            </li>
          </ul>
        </UCard>

        <UCard>
          <h2 class="mb-3 font-medium">Tambah Tamu</h2>
          <div class="mb-4 flex flex-wrap items-end gap-2">
            <UInput v-model="gName" placeholder="Nama tamu" />
            <UInput v-model="gGroup" placeholder="Grup (opsional)" />
            <USelect v-model="gSession" :items="sessionOptions" />
            <UButton label="Tambah" @click="addGuest" />
          </div>
          <div class="flex flex-wrap items-end gap-2">
            <UTextarea v-model="bulkText" :rows="4" placeholder="Tambah banyak: satu nama per baris" class="min-w-64" />
            <UInput v-model="bulkGroup" placeholder="Grup (opsional)" />
            <USelect v-model="bulkSession" :items="sessionOptions" />
            <UButton label="Tambah Semua" :disabled="!bulkNames.length" @click="addBulk" />
          </div>
        </UCard>

        <UCard>
          <h2 class="mb-3 font-medium">Daftar Tamu ({{ guests.length }})</h2>
          <div v-if="!guests.length" class="text-sm text-gray-500">Belum ada tamu.</div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-1">Nama</th><th>Grup</th><th>Sesi</th><th>Kode</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in guests" :key="g.id" class="border-t">
                <td class="py-1">{{ g.name }}</td>
                <td>{{ g.groupLabel || '—' }}</td>
                <td>{{ sessionById(g.sessionId) ? sessionLabel(sessionById(g.sessionId)) : '—' }}</td>
                <td class="font-mono text-xs">{{ g.code }}</td>
                <td class="flex justify-end gap-1 py-1">
                  <UButton size="xs" variant="ghost" :label="copied === g.code ? 'Tersalin' : 'Salin link'" @click="copyLink(g.code)" />
                  <UButton size="xs" variant="ghost" label="WA" @click="shareWa(g.code, g.name)" />
                  <UButton size="xs" color="error" variant="ghost" label="Hapus" @click="delGuest(g.id)" />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildGuestLink } from '~/utils/guest-link'
import { effectiveWaTemplate, renderWaTemplate, invitationWaVars, formatTimeRange, buildWhatsappUrl } from '~/utils/wa-template'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string

const { data: inv } = await useFetch<any>(`/api/admin/invitations/${id}`)
if (!inv.value) throw createError({ statusCode: 404, statusMessage: 'Tidak ditemukan' })
const slug = computed(() => (inv.value as any)?.slug ?? '')

const template = ref(effectiveWaTemplate((inv.value as any)?.waTemplate))
const templateOpen = ref(false)
const templateDraft = ref('')
function openTemplate() { templateDraft.value = template.value; templateOpen.value = true }
async function saveTemplate() {
  await $fetch(`/api/admin/invitations/${id}/wa-template`, { method: 'PATCH', body: { template: templateDraft.value } })
  template.value = effectiveWaTemplate(templateDraft.value)
  templateOpen.value = false
}

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
const NO_SESSION = 'none' // Nuxt UI USelect items must not use an empty-string value
const sessionOptions = computed(() => [{ label: '— tanpa sesi —', value: NO_SESSION }, ...sessions.value.map((s) => ({ label: sessionLabel(s), value: s.id }))])

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
const gSession = ref<string>(NO_SESSION)
async function addGuest() {
  if (!gName.value.trim()) return
  await $fetch(`/api/admin/invitations/${id}/guests`, { method: 'POST', body: { names: [gName.value.trim()], groupLabel: gGroup.value || undefined, sessionId: gSession.value !== NO_SESSION ? gSession.value : null } })
  gName.value = ''
  await refreshGuests()
}
const bulkText = ref('')
const bulkGroup = ref('')
const bulkSession = ref<string>(NO_SESSION)
const bulkNames = computed(() => bulkText.value.split('\n').map((s) => s.trim()).filter(Boolean))
async function addBulk() {
  if (!bulkNames.value.length) return
  await $fetch(`/api/admin/invitations/${id}/guests`, { method: 'POST', body: { names: bulkNames.value, groupLabel: bulkGroup.value || undefined, sessionId: bulkSession.value !== NO_SESSION ? bulkSession.value : null } })
  bulkText.value = ''
  await refreshGuests()
}
async function delGuest(gid: string) {
  await $fetch(`/api/admin/invitations/${id}/guests/${gid}`, { method: 'DELETE' })
  await refreshGuests()
}

const search = ref('')
const filteredGuests = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return guests.value
  return guests.value.filter((g) => g.name.toLowerCase().includes(q) || (g.groupLabel ?? '').toLowerCase().includes(q))
})
const groupCount = computed(() => new Set(guests.value.map((g) => g.groupLabel).filter(Boolean)).size)
const columns = [
  { accessorKey: 'name', header: 'Nama' },
  { accessorKey: 'groupLabel', header: 'Grup' },
  { id: 'session', header: 'Sesi' },
  { accessorKey: 'code', header: 'Kode' },
  { id: 'actions', header: '' },
]

const copied = ref<string | null>(null)
async function copyLink(code: string) {
  const url = buildGuestLink(window.location.origin, slug.value, code)
  await navigator.clipboard.writeText(url)
  copied.value = code
  setTimeout(() => { if (copied.value === code) copied.value = null }, 1500)
}
function shareWa(g: any) {
  const base = invitationWaVars(((inv.value as any)?.draftDocument?.sections) ?? [])
  const sess = sessionById(g.sessionId)
  const ts = sess ? sess.timeStart : base.timeStart
  const te = sess ? sess.timeEnd : base.timeEnd
  const vars = {
    GUEST_NAME: g.name,
    COUPLE_NAME: base.coupleName,
    DATE: base.date,
    TIME: formatTimeRange(ts, te),
    URL: buildGuestLink(window.location.origin, slug.value, g.code),
  }
  window.open(buildWhatsappUrl(renderWaTemplate(effectiveWaTemplate(template.value), vars)), '_blank')
}
</script>

<template>
  <UDashboardPanel id="guests">
    <template #header>
      <UDashboardNavbar title="Kelola Tamu">
        <template #right>
          <UButton variant="link" label="Template Pesan" @click="openTemplate" />
          <UButton variant="link" :to="`/admin/invitations/${id}/edit`" label="Editor" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-lg border border-default bg-elevated/40 p-4">
            <div class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-users" class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wide">Tamu</span>
            </div>
            <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ guests.length }}</p>
          </div>
          <div class="rounded-lg border border-default bg-elevated/40 p-4">
            <div class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-clock" class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wide">Sesi</span>
            </div>
            <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ sessions.length }}</p>
          </div>
          <div class="rounded-lg border border-default bg-elevated/40 p-4">
            <div class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-tags" class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wide">Grup</span>
            </div>
            <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">{{ groupCount }}</p>
          </div>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clock" class="size-5 text-primary" />
              <h2 class="font-semibold text-highlighted">Sesi Waktu</h2>
            </div>
          </template>
          <div v-if="!eventNames.length" class="rounded-lg border border-dashed border-default p-4 text-sm text-muted">
            Belum ada acara. Tambah bagian "Detail Acara" di editor dulu untuk membuat sesi.
          </div>
          <template v-else>
            <div class="mb-4 flex flex-wrap items-end gap-2">
              <USelect v-model="sTarget" :items="eventNames" placeholder="Acara" />
              <UInput v-model="sStart" placeholder="Mulai (mis. 09:00)" />
              <UInput v-model="sEnd" placeholder="Selesai (mis. 18:00 / Selesai)" />
              <UButton icon="i-lucide-plus" label="Tambah Sesi" @click="addSession" />
            </div>
            <div v-if="!sessions.length" class="text-sm text-muted">Belum ada sesi.</div>
            <div v-else class="flex flex-wrap gap-2">
              <UBadge v-for="s in sessions" :key="s.id" color="neutral" variant="subtle" size="lg" class="gap-1.5">
                <UIcon name="i-lucide-clock" class="size-3.5" />
                {{ sessionLabel(s) }}
                <button type="button" class="ml-1 text-error transition-opacity hover:opacity-70" @click="delSession(s.id)">
                  <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
              </UBadge>
            </div>
          </template>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-plus" class="size-5 text-primary" />
              <h2 class="font-semibold text-highlighted">Tambah Tamu</h2>
            </div>
          </template>
          <div class="mb-5 flex flex-wrap items-end gap-2">
            <UInput v-model="gName" placeholder="Nama tamu" @keyup.enter="addGuest" />
            <UInput v-model="gGroup" placeholder="Grup (opsional)" />
            <USelect v-model="gSession" :items="sessionOptions" />
            <UButton icon="i-lucide-plus" label="Tambah" @click="addGuest" />
          </div>
          <div class="border-t border-default pt-4">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Tambah Massal</p>
            <div class="flex flex-wrap items-end gap-2">
              <UTextarea v-model="bulkText" :rows="4" placeholder="Satu nama per baris" class="min-w-64" />
              <UInput v-model="bulkGroup" placeholder="Grup (opsional)" />
              <USelect v-model="bulkSession" :items="sessionOptions" />
              <UButton icon="i-lucide-list-plus" :label="bulkNames.length ? `Tambah ${bulkNames.length}` : 'Tambah Semua'" :disabled="!bulkNames.length" @click="addBulk" />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center gap-3">
              <UIcon name="i-lucide-users" class="size-5 text-primary" />
              <h2 class="font-semibold text-highlighted">Daftar Tamu</h2>
              <UBadge color="neutral" variant="subtle" :label="String(guests.length)" />
              <UInput v-model="search" icon="i-lucide-search" placeholder="Cari nama / grup" size="sm" class="ml-auto w-56" />
            </div>
          </template>
          <UTable :data="filteredGuests" :columns="columns" class="-mx-4 -my-2">
            <template #name-cell="{ row }">
              <span class="font-medium text-highlighted">{{ row.original.name }}</span>
            </template>
            <template #groupLabel-cell="{ row }">
              <UBadge v-if="row.original.groupLabel" color="neutral" variant="subtle" :label="row.original.groupLabel" />
              <span v-else class="text-dimmed">—</span>
            </template>
            <template #session-cell="{ row }">
              <UBadge v-if="sessionById(row.original.sessionId)" color="primary" variant="subtle" :label="sessionLabel(sessionById(row.original.sessionId))" />
              <span v-else class="text-dimmed">—</span>
            </template>
            <template #code-cell="{ row }">
              <span class="font-mono text-xs text-muted">{{ row.original.code }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton size="xs" variant="ghost" :icon="copied === row.original.code ? 'i-lucide-check' : 'i-lucide-link'" :label="copied === row.original.code ? 'Tersalin' : 'Salin'" @click="copyLink(row.original.code)" />
                <UButton size="xs" variant="ghost" color="success" icon="i-lucide-message-circle" label="WA" @click="shareWa(row.original)" />
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="delGuest(row.original.id)" />
              </div>
            </template>
            <template #empty>
              <div class="flex flex-col items-center gap-2 py-8 text-muted">
                <UIcon name="i-lucide-user-x" class="size-8 text-dimmed" />
                <span class="text-sm">{{ search ? 'Tidak ada tamu cocok.' : 'Belum ada tamu.' }}</span>
              </div>
            </template>
          </UTable>
        </UCard>
      </div>

      <UModal v-model:open="templateOpen" title="Template Pesan WhatsApp">
        <template #body>
          <p class="mb-2 text-xs text-muted">Placeholder: {GUEST_NAME} {COUPLE_NAME} {DATE} {TIME} {URL}</p>
          <UTextarea v-model="templateDraft" :rows="14" class="w-full" />
          <div class="mt-3 flex justify-end gap-2">
            <UButton variant="ghost" label="Batal" @click="templateOpen = false" />
            <UButton label="Simpan" @click="saveTemplate" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

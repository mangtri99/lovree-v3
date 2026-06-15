<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { slugify } from '~~/server/utils/slug'
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: list } = await useFetch('/api/admin/invitations')
const { data: themes } = await useFetch<any>('/api/admin/themes')
const themeItems = computed(() => ((themes.value as any[]) ?? []).map((t) => ({ label: t.name, value: t.id })))

const open = ref(false)
const title = ref('')
const slug = ref('')
const slugTouched = ref(false)
const type = ref<'wedding' | 'metatah' | 'wedding_metatah' | 'baby_3mo' | 'birthday'>('wedding')
const themeId = ref('')
const wordId = ref('')
const creating = ref(false)
const error = ref('')

const typeItems = [
  { label: 'Pernikahan', value: 'wedding' },
  { label: 'Pernikahan + Metatah', value: 'wedding_metatah' },
  { label: 'Metatah', value: 'metatah' },
  { label: '3 Bulanan', value: 'baby_3mo' },
  { label: 'Ulang Tahun', value: 'birthday' },
]

const { data: words } = await useFetch<any>('/api/admin/invitation-words', { query: { type } })
const wordItems = computed(() => ((words.value as any)?.words ?? []).map((w: any) => ({ label: w.name, value: w.id })))

watch(title, (t) => { if (!slugTouched.value) slug.value = slugify(t) })
watch(type, () => { wordId.value = '' })

const valid = computed(() => !!(title.value.trim() && slug.value.trim() && type.value && themeId.value && wordId.value))

function openModal() {
  open.value = true
  if (!themeId.value && (themes.value as any[])?.length) themeId.value = (themes.value as any[])[0].id
}
async function create() {
  if (!valid.value || creating.value) return
  error.value = ''; creating.value = true
  try {
    const inv = await $fetch<{ id: string }>('/api/admin/invitations', { method: 'POST', body: { title: title.value, slug: slug.value, type: type.value, themeId: themeId.value, invitationWordId: wordId.value } })
    await navigateTo(`/admin/invitations/${inv.id}/edit`)
  } catch (e: any) { error.value = e?.data?.message ?? 'Gagal' } finally { creating.value = false }
}
</script>

<template>
  <UDashboardPanel id="invitations">
    <template #header>
      <UDashboardNavbar title="Undangan Saya">
        <template #right>
          <UButton icon="i-lucide-plus" label="Buat Undangan" @click="openModal" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-2">
        <div v-if="!(list as any[])?.length" class="text-sm text-muted">Belum ada undangan.</div>
        <UCard v-for="inv in (list as any[])" :key="inv.id">
          <div class="flex items-center gap-2">
            <span>{{ inv.slug }}</span>
            <UBadge :color="inv.status === 'published' ? 'success' : 'neutral'" variant="subtle" :label="inv.status" />
            <UButton v-if="inv.status === 'published'" class="ml-auto" variant="link" icon="i-lucide-external-link" :to="`/u/${inv.slug}`" target="_blank" label="View" />
            <UButton :class="inv.status === 'published' ? '' : 'ml-auto'" variant="link" :to="`/admin/invitations/${inv.id}/edit`" label="Edit" />
            <UButton variant="link" :to="`/admin/invitations/${inv.id}/guests`" label="Tamu" />
            <UButton variant="link" :to="`/admin/invitations/${inv.id}/rsvp`" label="RSVP" />
          </div>
        </UCard>
      </div>

      <UModal v-model:open="open" title="Buat Undangan">
        <template #body>
          <div class="space-y-3">
            <UFormField label="Judul" required>
              <UInput v-model="title" placeholder="Judul undangan" class="w-full" />
            </UFormField>
            <UFormField label="Slug" required help="slug akan digunakan sebagai url undangan">
              <UInput v-model="slug" class="w-full" @update:model-value="slugTouched = true" />
            </UFormField>
            <UFormField label="Tipe" required>
              <USelect v-model="type" :items="typeItems" class="w-full" />
            </UFormField>
            <UFormField label="Tema" required>
              <USelect v-model="themeId" :items="themeItems" class="w-full" />
            </UFormField>
            <UFormField label="Template Konten" required>
              <USelect v-model="wordId" :items="wordItems" placeholder="Pilih kata-kata" class="w-full" />
            </UFormField>
            <p v-if="error" class="text-sm text-error">{{ error }}</p>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" label="Batal" @click="open = false" />
              <UButton label="Buat" :loading="creating" :disabled="!valid" @click="create" />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

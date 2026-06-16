<script setup lang="ts">
import { ref, watch, provide, computed } from 'vue'
import { createEditorState } from '~/composables/useInvitationEditor'
import { createDebouncer } from '~/composables/useAutosave'
import { reconcileSections } from '~/composables/useReconcile'
import SectionList from '~/components/editor/SectionList.vue'
import EditorPreview from '~/components/editor/EditorPreview.vue'
import SaveStatus from '~/components/editor/SaveStatus.vue'
import InvitationSettings from '~/components/editor/InvitationSettings.vue'
import SeoSettings from '~/components/editor/SeoSettings.vue'
import DesignControls from '~/components/editor/DesignControls.vue'
import { resolveTokens, tokensToCssVars } from '~~/server/theme/tokens'
import type { DesignOverrides } from '~~/server/theme/design-validate'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string
provide('invitationId', id)

const { data } = await useFetch(`/api/admin/invitations/${id}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Tidak ditemukan' })

const editor = createEditorState((data.value as any).draftDocument ?? { sections: [] })
const device = ref<'mobile' | 'desktop'>('mobile')
const showCover = ref(false)
const tab = ref('konten')
const tabItems = [
  { label: 'Konten', value: 'konten', icon: 'i-lucide-layout-list', slot: 'konten' as const },
  { label: 'Tampilan', value: 'tampilan', icon: 'i-lucide-palette', slot: 'tampilan' as const },
]
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const themeTokens = ref<Record<string, any>>(((data.value as any).themeTokens ?? {}) as Record<string, any>)
const themeId = ref<string>((data.value as any).themeId ?? '')
const themeKey = ref<string>((data.value as any).themeKey ?? 'base')
const { data: themesList } = await useFetch<any>('/api/admin/themes')
const themeItems = computed(() => ((themesList.value as any[]) ?? []).map((t) => ({ label: t.name, value: t.id })))
const overrides = ref<DesignOverrides>(((data.value as any).tokenOverrides ?? {}) as DesignOverrides)
const cssVars = computed(() => tokensToCssVars(resolveTokens(themeTokens.value as any, overrides.value as any)))

const designDebouncer = createDebouncer(saveDesign, 600)
async function saveDesign() {
  try { await $fetch(`/api/admin/invitations/${id}/design`, { method: 'PATCH', body: { tokenOverrides: overrides.value } }) } catch { /* non-fatal; preview already updated */ }
}
watch(overrides, () => designDebouncer.schedule(), { deep: true })
async function switchTheme(newId: string) {
  const t = ((themesList.value as any[]) ?? []).find((x) => x.id === newId)
  if (t) { themeTokens.value = t.tokens; themeKey.value = t.key ?? 'base' }
  try { await $fetch(`/api/admin/invitations/${id}/theme`, { method: 'PATCH', body: { themeId: newId } }) } catch { /* non-fatal; preview already updated */ }
}
watch(themeId, (v) => { if (v) switchTheme(v) })
const musicUrl = ref<string | null>((data.value as any).musicUrl ?? null)
const { data: tracksData } = await useFetch<any>('/api/admin/music')
const tracks = computed(() => ((tracksData.value as any)?.tracks ?? []))
const musicTrackId = ref<string | null>((data.value as any).musicTrackId ?? null)
async function setMusic(trackId: string | null) {
  musicTrackId.value = trackId
  await $fetch(`/api/admin/invitations/${id}/music`, { method: 'PATCH', body: { musicTrackId: trackId } })
}

const seo = ref((data.value as any).seo ?? { title: '', description: '', ogImage: { mediaId: '', url: '' } })
async function saveSeo(next: { title: string; description: string; ogImage: { mediaId: string; url: string } }) {
  seo.value = next
  try { await $fetch(`/api/admin/invitations/${id}/seo`, { method: 'PATCH', body: next }) } catch { /* non-fatal */ }
}

async function save() {
  saveState.value = 'saving'
  const sent = JSON.stringify(editor.doc)
  try {
    const res = await $fetch<{ ok: boolean; document: { sections: any[] } }>(`/api/admin/invitations/${id}/draft`, { method: 'PATCH', body: { document: editor.doc } })
    const adopt = reconcileSections(sent, editor.doc, res.document.sections)
    if (adopt) editor.doc.sections.splice(0, editor.doc.sections.length, ...(adopt as typeof editor.doc.sections))
    saveState.value = 'saved'
  } catch { saveState.value = 'error' }
}
const debouncer = createDebouncer(save, 1500)
watch(() => editor.doc, () => { saveState.value = 'saving'; debouncer.schedule() }, { deep: true })

const publishing = ref(false)
async function publish() {
  publishing.value = true
  try { await debouncer.flush(); await $fetch(`/api/admin/invitations/${id}/publish`, { method: 'POST' }) }
  finally { publishing.value = false }
}
</script>

<template>
  <UDashboardPanel id="editor">
    <template #header>
      <UDashboardNavbar title="Editor">
        <template #right>
          <UButton variant="ghost" color="neutral" icon="i-lucide-users" :to="`/admin/invitations/${id}/guests`" label="Tamu" />
          <UButton variant="ghost" color="neutral" icon="i-lucide-clipboard-list" :to="`/admin/invitations/${id}/rsvp`" label="RSVP" />
          <USeparator orientation="vertical" class="h-5" />
          <SaveStatus :state="saveState" />
          <UButton icon="i-lucide-rocket" label="Publish" :loading="publishing" @click="publish" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <UTabs v-model="tab" :items="tabItems" variant="link" class="w-full">
            <template #konten>
              <div class="pt-4">
                <SectionList
                  :sections="editor.doc.sections"
                  @add="editor.addSection"
                  @remove="editor.remove"
                  @toggle="editor.toggle"
                  @move="(p) => editor.move(p.from, p.to)"
                  @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
              </div>
            </template>
            <template #tampilan>
              <div class="space-y-4 pt-4">
                <InvitationSettings :tracks="tracks" :music-track-id="musicTrackId" :on-set-music="setMusic" @update:music-url="musicUrl = $event" />
                <SeoSettings :seo="seo" :on-save="saveSeo" />
                <div class="rounded border border-default bg-default p-3">
                  <UFormField label="Tema">
                    <USelect v-model="themeId" :items="themeItems" class="w-full" />
                  </UFormField>
                </div>
                <DesignControls v-model="overrides" :theme-tokens="themeTokens" />
              </div>
            </template>
          </UTabs>
        </div>
        <div class="flex flex-col md:sticky md:top-4 md:max-h-[calc(100vh-7rem)]">
          <div class="mb-2 flex shrink-0 items-center gap-2">
            <UButtonGroup size="xs">
              <UButton :variant="device === 'mobile' ? 'solid' : 'outline'" color="neutral" icon="i-lucide-smartphone" label="Mobile" @click="device = 'mobile'" />
              <UButton :variant="device === 'desktop' ? 'solid' : 'outline'" color="neutral" icon="i-lucide-monitor" label="Desktop" @click="device = 'desktop'" />
            </UButtonGroup>
            <span class="text-xs tabular-nums text-dimmed">{{ device === 'mobile' ? '390px' : 'Penuh' }}</span>
            <UButton class="ml-auto" size="xs" :variant="showCover ? 'solid' : 'soft'" color="primary" :icon="showCover ? 'i-lucide-eye' : 'i-lucide-image'" :label="showCover ? 'Lihat Isi' : 'Lihat Cover'" @click="showCover = !showCover" />
          </div>
          <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-default bg-muted/40 p-3">
            <EditorPreview class="h-full" :sections="editor.doc.sections" :css-vars="cssVars" :device="device" :show-cover="showCover" :music-url="musicUrl" :theme-key="themeKey" @open="showCover = false" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

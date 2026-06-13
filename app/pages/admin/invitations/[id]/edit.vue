<script setup lang="ts">
import { ref, watch, provide, computed } from 'vue'
import { createEditorState } from '~/composables/useInvitationEditor'
import { createDebouncer } from '~/composables/useAutosave'
import { reconcileSections } from '~/composables/useReconcile'
import SectionList from '~/components/editor/SectionList.vue'
import EditorPreview from '~/components/editor/EditorPreview.vue'
import SaveStatus from '~/components/editor/SaveStatus.vue'
import InvitationSettings from '~/components/editor/InvitationSettings.vue'
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
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const themeTokens = ref<Record<string, any>>(((data.value as any).themeTokens ?? {}) as Record<string, any>)
const themeId = ref<string>((data.value as any).themeId ?? '')
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
  if (t) themeTokens.value = t.tokens
  try { await $fetch(`/api/admin/invitations/${id}/theme`, { method: 'PATCH', body: { themeId: newId } }) } catch { /* non-fatal; preview already updated */ }
}
watch(themeId, (v) => { if (v) switchTheme(v) })
const musicUrl = ref<string | null>((data.value as any).musicUrl ?? null)
async function setMusic(mediaId: string | null) {
  await $fetch(`/api/admin/invitations/${id}/music`, { method: 'PATCH', body: { musicMediaId: mediaId } })
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
          <UButton variant="link" :to="`/admin/invitations/${id}/guests`" label="Tamu" />
          <UButton variant="link" :to="`/admin/invitations/${id}/rsvp`" label="RSVP" />
          <SaveStatus :state="saveState" />
          <UButton label="Publish" :loading="publishing" @click="publish" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="space-y-4">
          <InvitationSettings v-model:music-url="musicUrl" :on-set-music="setMusic" />
          <UFormField label="Tema" class="mb-3">
            <USelect v-model="themeId" :items="themeItems" class="w-full" />
          </UFormField>
          <DesignControls v-model="overrides" :theme-tokens="themeTokens" />
          <SectionList
            :sections="editor.doc.sections"
            @add="editor.addSection"
            @remove="editor.remove"
            @toggle="editor.toggle"
            @move="(p) => editor.move(p.from, p.to)"
            @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
        </div>
        <div class="flex flex-col md:sticky md:top-4 md:max-h-[calc(100vh-7rem)]">
          <div class="mb-2 flex shrink-0 gap-2">
            <UButton size="xs" :variant="device === 'mobile' ? 'solid' : 'outline'" label="Mobile" @click="device = 'mobile'" />
            <UButton size="xs" :variant="device === 'desktop' ? 'solid' : 'outline'" label="Desktop" @click="device = 'desktop'" />
            <UButton size="xs" :variant="showCover ? 'solid' : 'outline'" :label="showCover ? 'Lihat Isi' : 'Lihat Cover'" @click="showCover = !showCover" />
          </div>
          <EditorPreview class="min-h-0 flex-1" :sections="editor.doc.sections" :css-vars="cssVars" :device="device" :show-cover="showCover" :music-url="musicUrl" @open="showCover = false" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

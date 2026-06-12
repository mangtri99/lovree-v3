<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import { createEditorState } from '~/composables/useInvitationEditor'
import { createDebouncer } from '~/composables/useAutosave'
import { reconcileSections } from '~/composables/useReconcile'
import SectionList from '~/components/editor/SectionList.vue'
import EditorPreview from '~/components/editor/EditorPreview.vue'
import SaveStatus from '~/components/editor/SaveStatus.vue'
import InvitationSettings from '~/components/editor/InvitationSettings.vue'

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
const cssVars = ((data.value as any).cssVars ?? {}) as Record<string, string>
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
          <SaveStatus :state="saveState" />
          <UButton label="Publish" :loading="publishing" @click="publish" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="space-y-4">
          <InvitationSettings v-model:music-url="musicUrl" :on-set-music="setMusic" />
          <SectionList
            :sections="editor.doc.sections"
            @add="editor.addSection"
            @remove="editor.remove"
            @toggle="editor.toggle"
            @move="(p) => editor.move(p.from, p.to)"
            @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
        </div>
        <div>
          <div class="mb-2 flex gap-2">
            <UButton size="xs" :variant="device === 'mobile' ? 'solid' : 'outline'" label="Mobile" @click="device = 'mobile'" />
            <UButton size="xs" :variant="device === 'desktop' ? 'solid' : 'outline'" label="Desktop" @click="device = 'desktop'" />
            <UButton size="xs" :variant="showCover ? 'solid' : 'outline'" :label="showCover ? 'Lihat Isi' : 'Lihat Cover'" @click="showCover = !showCover" />
          </div>
          <EditorPreview :sections="editor.doc.sections" :css-vars="cssVars" :device="device" :show-cover="showCover" :music-url="musicUrl" @open="showCover = false" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

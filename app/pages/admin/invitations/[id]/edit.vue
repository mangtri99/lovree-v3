<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import { createEditorState } from '~/composables/useInvitationEditor'
import { createDebouncer } from '~/composables/useAutosave'
import SectionList from '~/components/editor/SectionList.vue'
import EditorPreview from '~/components/editor/EditorPreview.vue'
import SaveStatus from '~/components/editor/SaveStatus.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string
provide('invitationId', id)

const { data } = await useFetch(`/api/admin/invitations/${id}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Tidak ditemukan' })

const editor = createEditorState((data.value as any).draftDocument ?? { sections: [] })
const device = ref<'mobile' | 'desktop'>('mobile')
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const cssVars = ((data.value as any).cssVars ?? {}) as Record<string, string>

async function save() {
  saveState.value = 'saving'
  try {
    await $fetch(`/api/admin/invitations/${id}/draft`, { method: 'PATCH', body: { document: editor.doc } })
    saveState.value = 'saved'
  } catch { saveState.value = 'error' }
}
const debouncer = createDebouncer(save, 1500)
watch(() => editor.doc, () => { saveState.value = 'saving'; debouncer.schedule() }, { deep: true })

const publishing = ref(false)
async function publish() {
  publishing.value = true
  try { debouncer.flush(); await $fetch(`/api/admin/invitations/${id}/publish`, { method: 'POST' }) }
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
        <SectionList
          :sections="editor.doc.sections"
          @add="editor.addSection"
          @remove="editor.remove"
          @toggle="editor.toggle"
          @move="(p) => editor.move(p.from, p.to)"
          @set-field="(p) => editor.setField(p.id, p.key, p.value)" />
        <div>
          <div class="mb-2 flex gap-2">
            <UButton size="xs" :variant="device === 'mobile' ? 'solid' : 'outline'" label="Mobile" @click="device = 'mobile'" />
            <UButton size="xs" :variant="device === 'desktop' ? 'solid' : 'outline'" label="Desktop" @click="device = 'desktop'" />
          </div>
          <EditorPreview :sections="editor.doc.sections" :css-vars="cssVars" :device="device" :show-cover="false" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

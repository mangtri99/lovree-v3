<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import CoverModal from './CoverModal.vue'
import MusicPlayer from './MusicPlayer.vue'
import SectionRenderer from './SectionRenderer.vue'

const props = defineProps<{
  data: { slug?: string; cssVars: Record<string, string>; musicUrl: string | null; sections: Array<{ type: string; content: any }>; guestbook?: Array<{ name: string; message: string; attendance: string | null }> }
  guestName: string
  guestCode?: string
}>()

const opened = ref(false)
const guestbook = ref(props.data.guestbook ?? [])
provide('guestbook', guestbook)
provide('guestName', props.guestName)
provide('slug', props.data.slug ?? '')
provide('guestCode', props.guestCode ?? '')

const styleStr = computed(() => {
  const vars = Object.entries(props.data.cssVars).map(([k, v]) => `${k}: ${v}`).join('; ')
  return `${vars}; font-family: var(--font-body)`
})
const hero = computed(() => props.data.sections.find((s) => s.type === 'hero')?.content ?? { title: '', coupleName: '' })

function open() {
  opened.value = true
  if (import.meta.client) document.body.style.overflow = ''
}
onMounted(() => { if (!opened.value) document.body.style.overflow = 'hidden' })
// restore scroll if the user navigates away before opening the cover
onUnmounted(() => { document.body.style.overflow = '' })
</script>

<template>
  <div class="invitation min-h-screen" :style="styleStr">
    <CoverModal v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
    <template v-if="opened">
      <SectionRenderer v-for="(s, i) in data.sections" :key="i" :section="s" />
      <MusicPlayer v-if="data.musicUrl" :src="data.musicUrl" :playing="opened" />
    </template>
  </div>
</template>

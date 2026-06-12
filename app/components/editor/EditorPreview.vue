<script setup lang="ts">
import { computed } from 'vue'
import SectionRenderer from '../invitation/SectionRenderer.vue'
import CoverModal from '../invitation/CoverModal.vue'
import MusicPlayer from '../invitation/MusicPlayer.vue'

const props = defineProps<{
  sections: Array<{ id: string; type: string; enabled: boolean; content: any }>
  cssVars: Record<string, string>
  device: 'mobile' | 'desktop'
  showCover: boolean
  musicUrl?: string | null
}>()
const emit = defineEmits<{ open: [] }>()

const rootStyle = computed(() => {
  const vars = Object.entries(props.cssVars).map(([k, v]) => `${k}: ${v}`).join('; ')
  return `${vars}; font-family: var(--font-body)`
})
const frameStyle = computed(() => {
  const containment = 'transform: translateZ(0); contain: layout paint; overflow: auto; position: relative;'
  const width = props.device === 'mobile' ? 'width: 390px;' : 'width: 100%;'
  return `${containment} ${width}`
})
const visible = computed(() => props.sections.filter((s) => s.enabled))
const hero = computed(() => props.sections.find((s) => s.type === 'hero')?.content ?? { title: '', coupleName: '' })
</script>
<template>
  <div class="invitation h-full overflow-hidden" :style="rootStyle">
    <div data-preview-frame class="mx-auto h-full border bg-white" :style="frameStyle">
      <CoverModal v-if="showCover" :title="hero.title" :couple-name="hero.coupleName" guest-name="Tamu Undangan" @open="emit('open')" />
      <SectionRenderer v-for="s in visible" :key="s.id" :section="s" />
      <MusicPlayer v-if="showCover && musicUrl" :src="musicUrl" :playing="showCover" />
    </div>
  </div>
</template>

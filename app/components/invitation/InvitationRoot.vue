<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import CoverModal from './CoverModal.vue'
import MusicPlayer from './MusicPlayer.vue'
import SectionRenderer from './SectionRenderer.vue'
import OrnamentDivider from './OrnamentDivider.vue'

const props = defineProps<{
  data: { slug?: string; cssVars: Record<string, string>; musicUrl: string | null; sections: Array<{ type: string; content: any }>; guestbook?: Array<{ name: string; message: string; attendance: string | null }>; themeKey?: string }
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

const divider = computed(() => props.data.cssVars['--ornament-divider'] ?? 'none')
const motif = computed(() => props.data.cssVars['--ornament-motif'] ?? 'none')

function open() {
  opened.value = true
  if (import.meta.client) document.body.style.overflow = ''
}
onMounted(() => { if (!opened.value) document.body.style.overflow = 'hidden' })
// restore scroll if the user navigates away before opening the cover
onUnmounted(() => { document.body.style.overflow = '' })
</script>

<template>
  <div class="invitation relative min-h-screen" :style="styleStr">
    <CoverModal v-if="!opened" :title="hero.title" :couple-name="hero.coupleName" :guest-name="guestName" @open="open" />
    <template v-if="opened">
      <template v-for="(s, i) in data.sections" :key="i">
        <OrnamentDivider v-if="i > 0" :variant="divider" />
        <SectionRenderer :section="s" :theme-key="data.themeKey ?? 'base'" />
      </template>
      <div v-if="motif === 'corners'" class="pointer-events-none absolute inset-0 z-20" style="color: var(--color-primary)">
        <svg v-for="c in 4" :key="c" data-motif-corner aria-hidden="true" width="56" height="56" viewBox="0 0 56 56" fill="none"
          class="absolute opacity-40"
          :class="['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'][c - 1]"
          :style="{ transform: ['none', 'scaleX(-1)', 'scaleY(-1)', 'scale(-1,-1)'][c - 1] }">
          <path d="M4 4 H30 M4 4 V30" stroke="currentColor" stroke-width="1" />
          <path d="M10 10 q 22 0 22 22" stroke="currentColor" stroke-width="1" fill="none" />
          <circle cx="4" cy="4" r="2" fill="currentColor" />
        </svg>
      </div>
      <MusicPlayer v-if="data.musicUrl" :src="data.musicUrl" :playing="opened" />
    </template>
  </div>
</template>

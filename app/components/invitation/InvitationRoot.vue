<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CoverModal from './CoverModal.vue'
import MusicPlayer from './MusicPlayer.vue'
import SectionRenderer from './SectionRenderer.vue'

const props = defineProps<{
  data: { cssVars: Record<string, string>; musicUrl: string | null; sections: Array<{ type: string; content: any }> }
  guestName: string
}>()

const opened = ref(false)
const styleStr = computed(() => Object.entries(props.data.cssVars).map(([k, v]) => `${k}: ${v}`).join('; '))
const hero = computed(() => props.data.sections.find((s) => s.type === 'hero')?.content ?? { title: '', coupleName: '' })

function open() {
  opened.value = true
  if (import.meta.client) document.body.style.overflow = ''
}
onMounted(() => { if (!opened.value) document.body.style.overflow = 'hidden' })
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

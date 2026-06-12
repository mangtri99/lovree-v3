<script setup lang="ts">
import { computed } from 'vue'
import SectionRenderer from '../invitation/SectionRenderer.vue'

const props = defineProps<{
  sections: Array<{ id: string; type: string; enabled: boolean; content: any }>
  cssVars: Record<string, string>
  device: 'mobile' | 'desktop'
  showCover: boolean
}>()

const rootStyle = computed(() => Object.entries(props.cssVars).map(([k, v]) => `${k}: ${v}`).join('; '))
const frameStyle = computed(() => {
  const containment = 'transform: translateZ(0); contain: layout paint; overflow: auto; position: relative;'
  const width = props.device === 'mobile' ? 'width: 390px;' : 'width: 100%;'
  return `${containment} ${width}`
})
const visible = computed(() => props.sections.filter((s) => s.enabled))
</script>
<template>
  <div class="invitation" :style="rootStyle">
    <div data-preview-frame class="mx-auto h-full border bg-white" :style="frameStyle">
      <SectionRenderer v-for="s in visible" :key="s.id" :section="s" />
    </div>
  </div>
</template>

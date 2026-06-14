<script setup lang="ts">
defineOptions({ name: 'SectionRenderer' })
import { computed } from 'vue'
import { resolveSectionComponent } from './themePacks'

const props = defineProps<{ section: { type: string; content: any }; themeKey?: string }>()
const resolved = computed(() => resolveSectionComponent(props.themeKey ?? 'base', props.section.type))
</script>

<template>
  <component :is="resolved" v-if="resolved" :content="section.content" />
</template>

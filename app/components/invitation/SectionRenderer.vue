<script setup lang="ts">
defineOptions({ name: 'SectionRenderer' })
import { computed } from 'vue'
import { sectionComponents } from './sectionComponents'

const props = defineProps<{ section: { type: string; content: any } }>()
const resolved = computed(() => sectionComponents[props.section.type] ?? null)
</script>

<template>
  <component :is="resolved" v-if="resolved" :content="section.content" />
</template>

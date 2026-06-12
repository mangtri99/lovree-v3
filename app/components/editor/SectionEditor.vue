<script setup lang="ts">
import { computed } from 'vue'
import FieldEditor from './FieldEditor.vue'
import { deriveFieldEditors } from '../../utils/field-editors'
import type { SectionType } from '../../../server/registry/sections'

const props = defineProps<{ section: { id: string; type: string; enabled: boolean; content: any } }>()
const emit = defineEmits<{ 'set-field': [{ id: string; key: string; value: unknown }] }>()
const editors = computed(() => deriveFieldEditors(props.section.type as SectionType))
</script>
<template>
  <div class="space-y-3">
    <FieldEditor
      v-for="ed in editors" :key="ed.key" :descriptor="ed"
      :model-value="section.content[ed.key]"
      @update:model-value="(v) => emit('set-field', { id: section.id, key: ed.key, value: v })" />
  </div>
</template>

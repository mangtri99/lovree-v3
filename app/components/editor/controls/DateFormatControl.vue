<script setup lang="ts">
import { computed } from 'vue'
import { DATE_FORMATS } from '~/utils/date-format'
const props = defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
const items = computed(() => DATE_FORMATS.map((f) => ({ label: `${f.id} — ${f.example}`, value: f.id })))
</script>
<template>
  <UFormField :label="label">
    <USelect :model-value="props.modelValue || 'DD MMMM YYYY'" :items="items" class="w-full" @update:model-value="$emit('update:modelValue', String($event))" />
  </UFormField>
</template>

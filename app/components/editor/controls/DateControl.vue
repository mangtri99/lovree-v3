<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <UFormField :label="label">
    <UInput type="datetime-local" :model-value="modelValue" class="w-full" @update:model-value="$emit('update:modelValue', String($event))" />
  </UFormField>
</template>

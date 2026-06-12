<script setup lang="ts">
defineProps<{ modelValue: string; label?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>
<template>
  <UFormField :label="label">
    <UTextarea :model-value="modelValue" :rows="4" class="w-full" @update:model-value="$emit('update:modelValue', String($event))" />
  </UFormField>
</template>

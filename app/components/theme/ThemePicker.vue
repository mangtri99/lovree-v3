<script setup lang="ts">
import ThemePreviewCard from './ThemePreviewCard.vue'

defineOptions({ name: 'ThemePicker' })
defineProps<{ themes: Array<{ id: string; name: string; tokens: any }>; modelValue: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <ThemePreviewCard
      v-for="t in themes" :key="t.id"
      :theme="t" :selected="t.id === modelValue"
      @click="$emit('update:modelValue', t.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { googleCalendarUrl } from '~/utils/calendar'

defineOptions({ name: 'SaveDateButton' })
const props = defineProps<{ title: string; date: string; location?: string }>()
const url = computed(() => googleCalendarUrl({ title: props.title, date: props.date, location: props.location }))
</script>
<template>
  <a
    v-if="url" :href="url" target="_blank" rel="noopener noreferrer"
    class="mt-6 inline-block px-6 py-2 text-sm"
    style="border: 1px solid var(--color-primary); color: var(--color-primary); border-radius: var(--radius-md)"
  >📅 Simpan Tanggal</a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
type Row = { label: string; value: string }
const props = defineProps<{ content: { title: string; items: Row[] } }>()
const rows = computed(() => (props.content.items ?? []).filter((r) => (r.label ?? '') !== '' || (r.value ?? '') !== ''))
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 v-if="content.title" class="text-xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="mx-auto mt-4 max-w-md space-y-3">
      <div v-for="(row, i) in rows" :key="i" data-row>
        <p v-if="row.label" class="font-semibold">{{ row.label }}</p>
        <p v-if="row.value" data-value class="whitespace-pre-line text-sm">{{ row.value }}</p>
      </div>
    </div>
  </section>
</template>

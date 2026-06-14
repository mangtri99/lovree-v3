<script setup lang="ts">
import { ref, computed } from 'vue'
const NONE = 'none'
const props = defineProps<{ tracks: { id: string; name: string; url: string }[]; musicTrackId: string | null; onSetMusic: (id: string | null) => Promise<void> }>()
const emit = defineEmits<{ 'update:musicUrl': [string | null] }>()

const selected = ref<string>(props.musicTrackId ?? NONE)
const items = computed(() => [{ label: '— tanpa musik —', value: NONE }, ...props.tracks.map((t) => ({ label: t.name, value: t.id }))])
const currentUrl = computed(() => props.tracks.find((t) => t.id === selected.value)?.url ?? null)

async function onChange(v: string) {
  selected.value = v
  await props.onSetMusic(v === NONE ? null : v)
  emit('update:musicUrl', currentUrl.value)
}
</script>
<template>
  <div class="rounded border border-default bg-default p-3 text-sm">
    <h3 class="mb-2 font-medium text-highlighted">Pengaturan Undangan</h3>
    <span class="mb-1 block text-muted">Musik</span>
    <USelect :model-value="selected" :items="items" class="w-full" @update:model-value="onChange" />
    <audio v-if="currentUrl" :src="currentUrl" controls class="mt-2 h-8" />
    <NuxtLink to="/admin/music" class="mt-2 block text-xs text-primary">Kelola musik →</NuxtLink>
  </div>
</template>

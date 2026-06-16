<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SaveDateButton from '../../SaveDateButton.vue'
const props = defineProps<{ content: { targetDate: string; title?: string; location?: string } }>()
// Starts at 0 so SSR and first client render match (all zeros); the real clock
// starts on mount, avoiding a hydration mismatch on every page load.
const now = ref(0)
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => clearInterval(timer))
const remain = computed(() => {
  if (now.value === 0) return { d: 0, h: 0, m: 0, s: 0 }
  const diff = Math.max(0, new Date(props.content.targetDate).getTime() - now.value)
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
})
const units: Array<[string, 'D' | 'H' | 'M' | 'S']> = [['Hari', 'D'], ['Jam', 'H'], ['Menit', 'M'], ['Detik', 'S']]
</script>
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="mb-6 text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Menuju Hari Bahagia</h2>
    <div class="flex justify-center gap-4">
      <div v-for="[label, key] in units" :key="label" class="min-w-16 rounded-lg px-3 py-4" style="border: 1px solid var(--color-primary)">
        <div class="text-3xl" style="color: var(--color-primary)">{{ key === 'D' ? remain.d : key === 'H' ? remain.h : key === 'M' ? remain.m : remain.s }}</div>
        <div class="text-xs uppercase tracking-widest">{{ label }}</div>
      </div>
    </div>
    <SaveDateButton :title="content.title ?? ''" :date="content.targetDate" :location="content.location ?? ''" />
  </section>
</template>

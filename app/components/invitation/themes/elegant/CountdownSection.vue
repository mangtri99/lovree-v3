<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
const props = defineProps<{ content: { targetDate: string } }>()
const now = ref(0)
let timer: ReturnType<typeof setInterval>
onMounted(() => { now.value = Date.now(); timer = setInterval(() => (now.value = Date.now()), 1000) })
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
  <section class="px-6 py-16 text-center">
    <div class="flex justify-center gap-6">
      <div v-for="[label, key] in units" :key="label" class="min-w-14">
        <div class="text-4xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ key === 'D' ? remain.d : key === 'H' ? remain.h : key === 'M' ? remain.m : remain.s }}</div>
        <div class="mt-1 text-xs uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ label }}</div>
      </div>
    </div>
  </section>
</template>

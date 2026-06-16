<script setup lang="ts">
defineOptions({ name: 'DarkPradaCover' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-hidden px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <img src="/assets/dark-prada/ornament/hero-tl.svg" alt="" class="pointer-events-none absolute left-0 top-0 w-28" />
    <img src="/assets/dark-prada/ornament/hero-tr.svg" alt="" class="pointer-events-none absolute right-0 top-0 w-28" />
    <img src="/assets/dark-prada/ornament/hero-bl.svg" alt="" class="pointer-events-none absolute bottom-0 left-0 w-28" />
    <img src="/assets/dark-prada/ornament/hero-br.svg" alt="" class="pointer-events-none absolute bottom-0 right-0 w-28" />
    <div class="relative z-10">
      <p class="text-xs uppercase tracking-[0.3em]">{{ title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <p class="mt-6 text-sm">Kepada Yth.</p>
      <p class="text-lg">{{ guestName }}</p>
      <button type="button" class="mt-8 rounded-full px-8 py-3 text-sm" style="background: var(--color-primary); color: var(--color-bg)" @click="$emit('open')">Buka Undangan</button>
    </div>
  </div>
</template>

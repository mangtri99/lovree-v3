<script setup lang="ts">
defineOptions({ name: 'ElegantCover' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <div>
      <p class="text-xs uppercase tracking-[0.3em]" style="color: var(--color-secondary)">{{ title }}</p>
      <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
      <h1 class="text-5xl italic leading-tight" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <div class="mx-auto my-5 h-px w-16" style="background: var(--color-secondary)" />
      <p class="mt-2 text-sm">Kepada Yth.</p>
      <p class="text-lg">{{ guestName }}</p>
      <button type="button" class="mt-8 border px-8 py-3 text-sm uppercase tracking-[0.2em]" style="border-color: var(--color-primary); color: var(--color-primary)" @click="$emit('open')">Buka Undangan</button>
    </div>
  </div>
</template>

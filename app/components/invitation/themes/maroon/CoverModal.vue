<script setup lang="ts">
defineOptions({ name: 'MaroonCover' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-hidden px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <svg class="pointer-events-none absolute left-3 top-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <svg class="pointer-events-none absolute right-3 top-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent); transform: scaleX(-1)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <svg class="pointer-events-none absolute bottom-3 left-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent); transform: scaleY(-1)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <svg class="pointer-events-none absolute bottom-3 right-3" width="60" height="60" viewBox="0 0 60 60" fill="none" style="color: var(--color-accent); transform: scale(-1,-1)"><path d="M6 6 H34 M6 6 V34" stroke="currentColor" stroke-width="1.2" /><path d="M12 12 q 24 0 24 24" stroke="currentColor" stroke-width="1" fill="none" /><circle cx="6" cy="6" r="2.5" fill="currentColor" /></svg>
    <div class="relative z-10">
      <p class="text-xs uppercase tracking-[0.3em]" style="color: var(--color-accent)">{{ title }}</p>
      <h1 class="my-4 text-5xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <p class="mt-6 text-sm">Kepada Yth.</p>
      <p class="text-lg">{{ guestName }}</p>
      <button type="button" class="mt-8 px-8 py-3 text-sm uppercase tracking-[0.2em]" style="background: var(--color-primary); color: var(--color-bg); border-radius: var(--radius-md)" @click="$emit('open')">Buka Undangan</button>
    </div>
  </div>
</template>

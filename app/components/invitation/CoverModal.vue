<script setup lang="ts">
defineOptions({ name: 'CoverModal' })
defineProps<{ title: string; coupleName: string; guestName: string }>()
defineEmits<{ open: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 grid place-items-center px-6 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <div>
      <p class="tracking-widest uppercase" style="color: var(--color-secondary)">{{ title }}</p>
      <h1 class="my-4 text-4xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ coupleName }}</h1>
      <p class="mt-6 text-sm">Kepada Yth.</p>
      <p class="text-lg font-semibold">{{ guestName }}</p>
      <button type="button" class="mt-8 rounded-full px-6 py-3 text-white" style="background: var(--color-primary)" @click="$emit('open')">
        Buka Undangan
      </button>
    </div>
  </div>
</template>

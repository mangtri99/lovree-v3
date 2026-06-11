<script setup lang="ts">
defineProps<{ content: { title: string } }>()
const entries: Array<{ name: string; message: string }> = []
</script>
<template>
  <section class="px-6 py-12">
    <h2 class="text-center text-xl" style="font-family: var(--font-heading)">{{ content.title }}</h2>
    <p v-if="!entries.length" class="mt-3 text-center text-sm text-gray-500">Belum ada ucapan.</p>
    <ul class="mx-auto mt-4 max-w-md space-y-3">
      <li v-for="(e, i) in entries" :key="i" class="rounded border p-3">
        <div class="font-semibold">{{ e.name }}</div>
        <div class="text-sm">{{ e.message }}</div>
      </li>
    </ul>
  </section>
</template>

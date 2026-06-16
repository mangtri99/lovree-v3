<script setup lang="ts">
defineProps<{ content: { note: string; banks: Array<{ bank: string; number: string; holder: string }> } }>()
</script>
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Love Gift</h2>
    <p v-if="content.note" class="mx-auto mt-2 max-w-xl">{{ content.note }}</p>
    <div class="mx-auto mt-6 max-w-sm space-y-3">
      <div v-for="(b, i) in content.banks" :key="i" class="border p-4" style="border: 1px solid var(--color-accent); border-radius: var(--radius-lg)">
        <div class="font-semibold">{{ b.bank }}</div>
        <div class="text-lg tracking-wider">{{ b.number }}</div>
        <div class="text-sm">a.n. {{ b.holder }}</div>
      </div>
    </div>
  </section>
</template>

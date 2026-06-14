<script setup lang="ts">
defineProps<{ content: { note: string; banks: Array<{ bank: string; number: string; holder: string }> } }>()
</script>
<template>
  <section class="px-6 py-16 text-center">
    <h2 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">Love Gift</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="content.note" class="mx-auto max-w-xl">{{ content.note }}</p>
    <div class="mx-auto mt-6 max-w-sm space-y-3">
      <div v-for="(b, i) in content.banks" :key="i" class="rounded-lg border p-4" style="border-color: var(--color-secondary)">
        <div class="text-xs uppercase tracking-[0.2em]" style="color: var(--color-secondary)">{{ b.bank }}</div>
        <div class="mt-1 text-lg tracking-[0.2em]">{{ b.number }}</div>
        <div class="mt-1 text-sm">a.n. {{ b.holder }}</div>
      </div>
    </div>
  </section>
</template>

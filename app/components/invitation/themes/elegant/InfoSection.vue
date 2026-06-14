<script setup lang="ts">
defineProps<{ content: { phone: string; socials: Array<{ label: string; url: string }> } }>()
</script>
<template>
  <section class="px-6 py-16 text-center">
    <h2 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">Info Lebih Lanjut</h2>
    <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
    <p v-if="content.phone" class="mt-1">{{ content.phone }}</p>
    <div class="mt-3 flex justify-center gap-5">
      <a v-for="(s, i) in content.socials" :key="i" :href="s.url" target="_blank" rel="noopener" class="text-sm uppercase tracking-wider" style="color: var(--color-accent)">{{ s.label }}</a>
    </div>
  </section>
</template>

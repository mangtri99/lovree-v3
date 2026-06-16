<script setup lang="ts">
defineProps<{ content: { phone: string; socials: Array<{ label: string; url: string }> } }>()
</script>
<template>
  <section class="px-6 py-14 text-center" style="background: var(--color-bg); color: var(--color-text)">
    <h2 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Info Lebih Lanjut</h2>
    <p v-if="content.phone" class="mt-2">{{ content.phone }}</p>
    <div class="mt-4 flex justify-center gap-4">
      <a v-for="(s, i) in content.socials" :key="i" :href="s.url" target="_blank" rel="noopener noreferrer" class="text-sm" style="color: var(--color-accent)">{{ s.label }}</a>
    </div>
  </section>
</template>

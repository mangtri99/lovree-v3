<script setup lang="ts">
defineProps<{ content: { phone: string; socials: Array<{ label: string; url: string }> } }>()
</script>
<template>
  <section class="px-6 py-12 text-center">
    <h2 class="text-xl" style="font-family: var(--font-heading)">Info Lebih Lanjut</h2>
    <p v-if="content.phone" class="mt-2">{{ content.phone }}</p>
    <div class="mt-3 flex justify-center gap-4">
      <a v-for="(s, i) in content.socials" :key="i" :href="s.url" style="color: var(--color-accent)">{{ s.label }}</a>
    </div>
  </section>
</template>

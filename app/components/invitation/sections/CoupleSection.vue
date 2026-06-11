<script setup lang="ts">
defineProps<{ content: { people: Array<{ name: string; parents: string; childOrder: string; address: string; instagram: string; photoMediaId: string | null }> } }>()
</script>
<template>
  <section class="space-y-10 px-6 py-12">
    <div v-for="(p, i) in content.people" :key="i" class="text-center">
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
      <p v-if="p.childOrder" class="mt-1">{{ p.childOrder }}</p>
      <p v-if="p.parents" class="mt-1 whitespace-pre-line">{{ p.parents }}</p>
      <p v-if="p.address" class="mt-1 text-sm text-gray-600">{{ p.address }}</p>
      <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
    </div>
  </section>
</template>

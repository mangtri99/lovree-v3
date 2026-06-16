<script setup lang="ts">
type Person = { name: string; parents: string; childOrder: string; address: string; instagram: string; photo: { mediaId: string; url: string } }
defineProps<{ content: { people: Person[] } }>()
</script>
<template>
  <section class="space-y-10 px-6 py-14" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(p, i) in content.people" :key="i" class="text-center">
      <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" style="border: 2px solid var(--color-accent)" loading="lazy" />
      <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
      <p v-if="p.childOrder" class="mt-1">{{ p.childOrder }}</p>
      <p v-if="p.parents" class="mt-1 whitespace-pre-line">{{ p.parents }}</p>
      <p v-if="p.address" class="mt-1 text-sm">{{ p.address }}</p>
      <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
    </div>
  </section>
</template>

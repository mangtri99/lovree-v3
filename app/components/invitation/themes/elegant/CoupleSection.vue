<script setup lang="ts">
type Person = { name: string; parents: string; childOrder: string; address: string; instagram: string; photo: { mediaId: string; url: string } }
defineProps<{ content: { people: Person[] } }>()
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div class="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
      <div v-for="(p, i) in content.people" :key="i" class="rounded-lg border p-6 text-center" style="border-color: var(--color-secondary)">
        <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-4 h-28 w-28 rounded-full object-cover" loading="lazy" />
        <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
        <p v-if="p.childOrder" class="mt-1 text-sm">{{ p.childOrder }}</p>
        <p v-if="p.parents" class="mt-2 whitespace-pre-line text-sm">{{ p.parents }}</p>
        <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-2 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
      </div>
    </div>
  </section>
</template>

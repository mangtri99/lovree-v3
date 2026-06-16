<script setup lang="ts">
type Person = { name: string; instagram: string; photo: { mediaId: string; url: string } }
type Member = { peoples: Person[]; parents: string; childOrder: string }
defineProps<{ content: { members: Member[] } }>()
</script>
<template>
  <section class="space-y-12 px-6 py-12">
    <div v-for="(g, gi) in content.members" :key="gi" class="text-center">
      <p v-if="g.childOrder" class="mb-1">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mb-6 whitespace-pre-line">{{ g.parents }}</p>
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-32 w-32 rounded-full object-cover" loading="lazy" />
          <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type Person = { name: string; instagram: string; photo: { mediaId: string; url: string } }
type Member = { peoples: Person[]; parents: string; childOrder: string }
defineProps<{ content: { members: Member[] } }>()
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(g, gi) in content.members" :key="gi" class="mx-auto mb-12 max-w-xl text-center last:mb-0">
      <p v-if="g.childOrder" class="text-sm uppercase tracking-[0.25em]">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mt-2 mb-6 whitespace-pre-line text-sm italic">{{ g.parents }}</p>
      <div class="mx-auto my-4 h-px w-16" style="background: var(--color-secondary)" />
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="mx-auto mb-3 h-28 w-28 rounded-full object-cover" loading="lazy" />
          <h3 class="text-2xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-2 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
    </div>
  </section>
</template>

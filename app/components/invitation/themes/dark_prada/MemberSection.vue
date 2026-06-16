<script setup lang="ts">
type Person = { name: string; instagram: string; photo: { mediaId: string; url: string } }
type Member = { peoples: Person[]; parents: string; childOrder: string }
defineProps<{ content: { members: Member[] } }>()
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <div v-for="(g, gi) in content.members" :key="gi" class="mx-auto mb-12 max-w-xl text-center last:mb-0">
      <p v-if="g.childOrder" class="text-sm uppercase tracking-[0.25em]" style="color: var(--color-primary)">{{ g.childOrder }}</p>
      <p v-if="g.parents" class="mt-2 mb-6 whitespace-pre-line text-sm">{{ g.parents }}</p>
      <div class="space-y-8">
        <div v-for="(p, i) in g.peoples" :key="i">
          <div class="relative mx-auto mb-3 h-32 w-32">
            <img v-if="p.photo?.url" :src="p.photo.url" alt="" class="h-32 w-32 rounded-full object-cover" loading="lazy" />
            <img src="/assets/dark-prada/ornament/frame.svg" alt="" class="pointer-events-none absolute inset-0 h-full w-full scale-125" />
          </div>
          <h3 class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ p.name }}</h3>
          <a v-if="p.instagram" :href="`https://instagram.com/${p.instagram}`" class="mt-1 inline-block text-sm" style="color: var(--color-accent)">@{{ p.instagram }}</a>
        </div>
      </div>
      <img src="/assets/dark-prada/divider/flower.svg" alt="" class="mx-auto mt-8 h-8" />
    </div>
  </section>
</template>

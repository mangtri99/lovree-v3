<script setup lang="ts">
import { computed } from 'vue'
import GalleryCarousel from '../../GalleryCarousel.vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title?: string; items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-3 py-14" style="background: var(--color-bg)">
    <h2 v-if="content.title" class="mb-6 text-center text-3xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div class="mx-auto hidden max-w-3xl gap-2 md:grid md:grid-cols-3">
      <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="h-40 w-full rounded object-cover" style="border: 1px solid var(--color-primary)" loading="lazy" />
    </div>
  </section>
</template>

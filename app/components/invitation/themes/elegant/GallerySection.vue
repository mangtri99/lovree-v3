<script setup lang="ts">
import { computed } from 'vue'
import GalleryCarousel from '../../GalleryCarousel.vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title?: string; items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-6 py-16" style="background: var(--color-bg); color: var(--color-text)">
    <h2 v-if="content.title" class="mb-6 text-center text-3xl italic" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div data-grid class="mx-auto hidden max-w-3xl gap-3 md:grid md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="aspect-square w-full rounded object-cover" loading="lazy" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GalleryCarousel from '../GalleryCarousel.vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title?: string; items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-2 py-12">
    <h2 v-if="content.title" class="mb-6 text-center text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">{{ content.title }}</h2>
    <div class="md:hidden"><GalleryCarousel :images="renderable" /></div>
    <div class="hidden grid-cols-2 gap-2 md:grid md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
    </div>
  </section>
</template>

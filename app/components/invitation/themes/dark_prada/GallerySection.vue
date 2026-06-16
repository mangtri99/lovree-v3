<script setup lang="ts">
import { computed } from 'vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-3 py-14" style="background: var(--color-bg)">
    <div class="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
      <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="h-40 w-full rounded object-cover" style="border: 1px solid var(--color-primary)" loading="lazy" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { items: Img[] } }>()
const renderable = computed(() => (props.content.items ?? []).filter((it) => !!it.url))
</script>
<template>
  <section class="px-2 py-12">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
      <img v-for="(item, i) in renderable" :key="i" :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
    </div>
  </section>
</template>

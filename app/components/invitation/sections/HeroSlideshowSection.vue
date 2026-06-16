<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatDate } from '~/utils/date-format'
type Img = { mediaId: string; url: string }
const props = defineProps<{ content: { title: string; coupleName: string; date: string; dateFormat: string; images: Img[] } }>()
const renderable = computed(() => (props.content.images ?? []).filter((i) => !!i.url))
const idx = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { if (renderable.value.length > 1) timer = setInterval(() => { idx.value = (idx.value + 1) % renderable.value.length }, 4000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
<template>
  <section class="relative overflow-hidden py-32 text-center text-white" style="background: var(--color-bg)">
    <img v-for="(img, i) in renderable" :key="i" :src="img.url" alt="" class="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000" :class="i === idx ? 'opacity-100' : 'opacity-0'" loading="lazy" />
    <div class="absolute inset-0 bg-black/40" />
    <div class="relative z-10">
      <p class="tracking-widest uppercase">{{ content.title }}</p>
      <h1 class="my-4 text-4xl" style="font-family: var(--font-heading)">{{ content.coupleName }}</h1>
      <p v-if="content.date">{{ formatDate(content.date, content.dateFormat) }}</p>
    </div>
  </section>
</template>

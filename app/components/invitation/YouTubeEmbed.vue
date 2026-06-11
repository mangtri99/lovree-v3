<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ videoId: string }>()
const playing = ref(false)
const thumb = computed(() => `https://i.ytimg.com/vi/${props.videoId}/hqdefault.jpg`)
const src = computed(() => `https://www.youtube-nocookie.com/embed/${props.videoId}?autoplay=1`)
</script>

<template>
  <div class="relative aspect-video w-full overflow-hidden rounded">
    <iframe v-if="playing" :src="src" class="h-full w-full" allow="autoplay; encrypted-media" allowfullscreen />
    <button v-else type="button" aria-label="Putar video" class="group relative block h-full w-full" @click="playing = true">
      <img :src="thumb" alt="" class="h-full w-full object-cover" loading="lazy" />
      <span class="absolute inset-0 grid place-items-center">
        <span class="rounded-full bg-black/60 px-4 py-2 text-white">▶</span>
      </span>
    </button>
  </div>
</template>

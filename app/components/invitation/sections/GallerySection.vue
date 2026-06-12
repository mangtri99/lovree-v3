<script setup lang="ts">
import { computed } from 'vue'
type ImageItem = { type: 'image'; mediaId: string; url: string }
type YoutubeItem = { type: 'youtube'; videoId: string }
type Item = ImageItem | YoutubeItem
const props = defineProps<{ content: { items: Item[] } }>()

const isValidYoutube = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id)
const renderable = computed(() => (props.content.items ?? []).filter((it) =>
  it.type === 'image' ? !!it.url : isValidYoutube(it.videoId)))
</script>
<template>
  <section class="px-2 py-12">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
      <template v-for="(item, i) in renderable" :key="i">
        <YouTubeEmbed v-if="item.type === 'youtube'" :video-id="item.videoId" class="col-span-2 md:col-span-3" />
        <img v-else :src="item.url" alt="" class="h-full w-full object-cover" loading="lazy" />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ content: { videos: { videoId: string }[] } }>();
const isValid = (id: string) => /^[A-Za-z0-9_-]{11}$/.test(id);
const renderable = computed(() =>
  (props.content.videos ?? []).filter((v) => isValid(v.videoId)),
);
</script>
<template>
  <section
    class="mx-auto max-w-2xl space-y-6 px-6 py-16"
    style="background: var(--color-bg); color: var(--color-text)"
  >
    <YouTubeEmbed v-for="(v, i) in renderable" :key="i" :video-id="v.videoId" />
  </section>
</template>

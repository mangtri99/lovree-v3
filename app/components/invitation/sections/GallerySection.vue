<script setup lang="ts">
defineProps<{ content: { items: Array<{ type: 'image'; mediaId: string } | { type: 'youtube'; videoId: string }> } }>()
</script>
<template>
  <section class="px-2 py-12">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
      <template v-for="(item, i) in content.items" :key="i">
        <YouTubeEmbed v-if="item.type === 'youtube'" :video-id="(item as { type: 'youtube'; videoId: string }).videoId" class="col-span-2 md:col-span-3" />
        <NuxtImg v-else :src="(item as { type: 'image'; mediaId: string }).mediaId" alt="" class="h-full w-full object-cover" loading="lazy" />
      </template>
    </div>
  </section>
</template>

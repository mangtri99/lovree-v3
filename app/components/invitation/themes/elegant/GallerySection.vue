<script setup lang="ts">
import { computed } from "vue";
type Img = { mediaId: string; url: string };
const props = defineProps<{ content: { items: Img[] } }>();
const renderable = computed(() =>
  (props.content.items ?? []).filter((it) => !!it.url),
);
</script>
<template>
  <section
    class="px-6 py-16"
    style="background: var(--color-bg); color: var(--color-text)"
  >
    <div class="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
      <img
        v-for="(item, i) in renderable"
        :key="i"
        :src="item.url"
        alt=""
        class="aspect-square w-full rounded object-cover"
        loading="lazy"
      />
    </div>
  </section>
</template>

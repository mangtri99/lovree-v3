<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <div class="px-6 py-12 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left [&_p]:tracking-[0.25em]" style="background: var(--color-primary); color: white">
    <div v-if="content.text" v-html="content.text" class="richtext" />
    <template v-else><span class="uppercase tracking-[0.25em]">Made with Lovree</span></template>
  </div>
</template>

<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <div class="px-6 py-10 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left" style="background: var(--color-primary); color: white">
    <div v-if="content.text" v-html="content.text" class="richtext" />
    <template v-else>Made with Lovree</template>
  </div>
</template>

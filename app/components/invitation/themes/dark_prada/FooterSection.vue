<script setup lang="ts">
defineProps<{ content: { text: string } }>()
</script>
<template>
  <div class="px-6 py-12 text-center text-sm [&_ul]:inline-block [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left" style="background: var(--color-secondary); color: var(--color-text)">
    <div v-if="content.text" v-html="content.text" class="richtext" />
    <template v-else>Made with Lovree</template>
    <div class="mt-4 flex justify-center gap-4">
      <img src="/assets/dark-prada/icon/whatsapp.svg" alt="WhatsApp" class="h-5 w-5" />
      <img src="/assets/dark-prada/icon/facebook.svg" alt="Facebook" class="h-5 w-5" />
      <img src="/assets/dark-prada/icon/instagram.svg" alt="Instagram" class="h-5 w-5" />
    </div>
  </div>
</template>

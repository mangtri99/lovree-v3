<script setup lang="ts">
import { ref } from 'vue'
import MediaUploader from './MediaUploader.vue'

interface Seo { title: string; description: string; ogImage: { mediaId: string; url: string } }
const props = defineProps<{ seo: Seo; onSave: (seo: Seo) => Promise<void> | void }>()

const title = ref(props.seo.title ?? '')
const description = ref(props.seo.description ?? '')
const ogImage = ref<{ mediaId: string; url: string }>({ ...(props.seo.ogImage ?? { mediaId: '', url: '' }) })

function current(): Seo {
  return { title: title.value, description: description.value, ogImage: ogImage.value }
}
async function save() {
  await props.onSave(current())
}
function onUploaded(p: { id: string; url: string }) {
  ogImage.value = { mediaId: p.id, url: p.url }
  save()
}
function clearOgImage() {
  ogImage.value = { mediaId: '', url: '' }
  save()
}
</script>

<template>
  <div class="rounded border border-default bg-default p-3 text-sm">
    <h3 class="mb-2 font-medium text-highlighted">SEO &amp; Share</h3>
    <p class="mb-2 text-xs text-muted">Kosongkan untuk memakai default otomatis dari konten undangan.</p>

    <UFormField label="Judul (title)">
      <UInput v-model="title" class="w-full" placeholder="Otomatis dari konten" @blur="save" />
    </UFormField>

    <UFormField label="Deskripsi" class="mt-2">
      <UTextarea v-model="description" class="w-full" placeholder="Otomatis dari konten" @blur="save" />
    </UFormField>

    <span class="mt-3 mb-1 block text-muted">Gambar share (OG image)</span>
    <img v-if="ogImage.url" :src="ogImage.url" alt="" class="mb-2 h-24 w-auto rounded object-cover" />
    <div class="flex items-center gap-2">
      <MediaUploader kind="image" @uploaded="onUploaded" />
      <UButton v-if="ogImage.url" variant="ghost" color="neutral" label="Hapus" @click="clearOgImage" />
    </div>
  </div>
</template>

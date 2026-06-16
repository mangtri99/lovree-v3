<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineOptions({ name: 'GalleryCarousel' })
type Img = { mediaId: string; url: string }
const props = defineProps<{ images: Img[] }>()

const index = ref(0)
const lightbox = ref(false)

function go(i: number) {
  const n = props.images.length
  if (n) index.value = ((i % n) + n) % n
}
function prev() { go(index.value - 1) }
function next() { go(index.value + 1) }
function openLightbox() { lightbox.value = true }
function closeLightbox() { lightbox.value = false }

function onKey(e: KeyboardEvent) {
  if (!lightbox.value) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="images.length">
    <div class="relative">
      <img
        data-main :src="images[index]?.url" alt=""
        class="aspect-[4/5] w-full cursor-zoom-in rounded object-cover"
        loading="lazy" @click="openLightbox"
      />
      <button v-if="images.length > 1" type="button" data-prev aria-label="Sebelumnya"
        class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white" @click.stop="prev">‹</button>
      <button v-if="images.length > 1" type="button" data-next aria-label="Berikutnya"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white" @click.stop="next">›</button>
    </div>

    <div v-if="images.length > 1" class="mt-2 flex gap-2 overflow-x-auto">
      <img
        v-for="(img, i) in images" :key="i" data-thumb :src="img.url" alt=""
        class="h-16 w-16 flex-shrink-0 cursor-pointer rounded object-cover transition"
        :class="i === index ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-60'"
        loading="lazy" @click="go(i)"
      />
    </div>

    <div v-if="lightbox" data-lightbox class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" @click="closeLightbox">
      <img :src="images[index]?.url" alt="" class="max-h-[90vh] max-w-[95vw] object-contain" @click.stop />
      <button type="button" data-close aria-label="Tutup" class="absolute right-4 top-4 text-3xl text-white" @click.stop="closeLightbox">✕</button>
      <button v-if="images.length > 1" type="button" aria-label="Sebelumnya" class="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-white" @click.stop="prev">‹</button>
      <button v-if="images.length > 1" type="button" aria-label="Berikutnya" class="absolute right-4 top-1/2 -translate-y-1/2 text-4xl text-white" @click.stop="next">›</button>
    </div>
  </div>
</template>

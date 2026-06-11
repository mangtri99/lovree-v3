<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ src: string; playing: boolean }>()
const audio = ref<HTMLAudioElement | null>(null)
const muted = ref(false)
watch(() => props.playing, (p) => { if (p) audio.value?.play().catch(() => {}) })
function toggle() {
  muted.value = !muted.value
  if (audio.value) audio.value.muted = muted.value
}
</script>
<template>
  <div>
    <audio ref="audio" :src="src" loop />
    <button v-if="playing" type="button" class="fixed bottom-4 right-4 z-40 rounded-full p-3 text-white shadow" style="background: var(--color-primary)" @click="toggle">
      {{ muted ? '🔇' : '🔊' }}
    </button>
  </div>
</template>

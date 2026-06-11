<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
const props = defineProps<{ src: string; playing: boolean }>()
const audio = ref<HTMLAudioElement | null>(null)
const muted = ref(false)
function play() { audio.value?.play().catch(() => {}) }
// The player mounts only after the cover opens, so `playing` is already true at
// mount and the watcher (change-only) never fires — start playback on mount too.
onMounted(() => { if (props.playing) play() })
watch(() => props.playing, (p) => { if (p) play() })
function toggle() {
  muted.value = !muted.value
  if (audio.value) audio.value.muted = muted.value
}
</script>
<template>
  <div>
    <audio ref="audio" :src="src" loop />
    <button v-if="playing" type="button" :aria-label="muted ? 'Nyalakan musik' : 'Matikan musik'" class="fixed bottom-4 right-4 z-40 rounded-full p-3 text-white shadow" style="background: var(--color-primary)" @click="toggle">
      {{ muted ? '🔇' : '🔊' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveTokens, tokensToCssVars } from '~~/server/theme/tokens'

defineOptions({ name: 'ThemePreviewCard' })
const props = defineProps<{ theme: { id: string; name: string; tokens: any }; selected: boolean }>()

const resolved = computed(() => resolveTokens(props.theme.tokens ?? {}, {}))
const styleStr = computed(() =>
  Object.entries(tokensToCssVars(resolved.value)).map(([k, v]) => `${k}: ${v}`).join('; '))
const divider = computed(() => resolved.value.ornament.divider)
const swatches = ['primary', 'secondary', 'bg', 'text', 'accent'] as const
</script>

<template>
  <button
    type="button"
    class="block w-full overflow-hidden rounded-lg border border-default text-left transition hover:-translate-y-0.5 hover:shadow-md"
    :class="{ 'ring-2 ring-offset-1': selected }"
    :style="styleStr"
  >
    <div class="px-4 py-6 text-center" style="background: var(--color-bg)">
      <p class="text-2xl" style="font-family: var(--font-heading); color: var(--color-primary)">Budi &amp; Ani</p>
      <div v-if="divider === 'flourish'" class="mt-2 flex justify-center" style="color: var(--color-primary)">
        <svg width="64" height="10" viewBox="0 0 64 10" fill="none" aria-hidden="true">
          <line x1="4" y1="5" x2="26" y2="5" stroke="currentColor" stroke-width="1" />
          <path d="M32 1 L35 5 L32 9 L29 5 Z" fill="currentColor" />
          <line x1="38" y1="5" x2="60" y2="5" stroke="currentColor" stroke-width="1" />
        </svg>
      </div>
      <div v-else-if="divider === 'line'" class="mx-auto mt-2 h-px w-10" style="background: var(--color-secondary)" />
      <div class="mt-3 flex justify-center gap-1.5">
        <span
          v-for="k in swatches" :key="k" data-swatch
          class="h-3 w-3 rounded-full ring-1 ring-black/10"
          :style="{ background: `var(--color-${k})` }"
        />
      </div>
    </div>
    <div class="flex items-center justify-between bg-default px-3 py-2">
      <span class="text-sm font-medium text-highlighted">{{ theme.name }}</span>
      <span v-if="selected" class="text-primary" aria-label="terpilih">✓</span>
    </div>
  </button>
</template>

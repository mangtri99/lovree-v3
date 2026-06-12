<script setup lang="ts">
import { HEADING_FONTS, BODY_FONTS } from '../../../server/theme/fonts'
import type { DesignOverrides } from '../../../server/theme/design-validate'

type ColorKey = 'primary' | 'secondary' | 'accent'
const props = defineProps<{ modelValue: DesignOverrides; themeTokens: { color?: Record<string, string>; font?: Record<string, string> } }>()
const emit = defineEmits<{ 'update:modelValue': [DesignOverrides] }>()

const colorRows: { key: ColorKey; label: string }[] = [
  { key: 'primary', label: 'Warna Utama' },
  { key: 'secondary', label: 'Warna Sekunder' },
  { key: 'accent', label: 'Warna Aksen' },
]

function emitWith(mut: (o: DesignOverrides) => void) {
  const next: DesignOverrides = JSON.parse(JSON.stringify(props.modelValue ?? {}))
  mut(next)
  if (next.color && Object.keys(next.color).length === 0) delete next.color
  if (next.font && Object.keys(next.font).length === 0) delete next.font
  emit('update:modelValue', next)
}
function colorValue(key: ColorKey): string {
  return props.modelValue.color?.[key] ?? props.themeTokens?.color?.[key] ?? '#000000'
}
function setColor(key: ColorKey, val: string) { emitWith((o) => { (o.color ??= {})[key] = val }) }
function clearColor(key: ColorKey) { emitWith((o) => { if (o.color) delete o.color[key] }) }
function setFont(key: 'heading' | 'body', val: string) {
  emitWith((o) => { if (!val) { if (o.font) delete o.font[key] } else (o.font ??= {})[key] = val })
}
function reset() { emit('update:modelValue', {}) }
</script>

<template>
  <div class="rounded border p-3 text-sm">
    <h3 class="mb-2 font-medium text-gray-700">Desain</h3>

    <div v-for="row in colorRows" :key="row.key" class="mb-2 flex items-center gap-2">
      <span class="w-28 text-gray-600">{{ row.label }}</span>
      <input type="color" :data-color="row.key" :value="colorValue(row.key)" @change="setColor(row.key, ($event.target as HTMLInputElement).value)" />
      <input type="text" class="w-24 rounded border px-1 py-0.5" :data-hex="row.key" :value="modelValue.color?.[row.key] ?? ''" placeholder="ikut tema" @change="setColor(row.key, ($event.target as HTMLInputElement).value)" />
      <button v-if="modelValue.color?.[row.key]" type="button" class="text-xs text-gray-400" @click="clearColor(row.key)">×</button>
    </div>

    <div class="mb-2 flex items-center gap-2">
      <span class="w-28 text-gray-600">Font Judul</span>
      <select data-font="heading" class="rounded border px-1 py-0.5" :value="modelValue.font?.heading ?? ''" @change="setFont('heading', ($event.target as HTMLSelectElement).value)">
        <option value="">— ikut tema —</option>
        <option v-for="f in HEADING_FONTS" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>
    <div class="mb-3 flex items-center gap-2">
      <span class="w-28 text-gray-600">Font Teks</span>
      <select data-font="body" class="rounded border px-1 py-0.5" :value="modelValue.font?.body ?? ''" @change="setFont('body', ($event.target as HTMLSelectElement).value)">
        <option value="">— ikut tema —</option>
        <option v-for="f in BODY_FONTS" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <button type="button" data-reset class="text-xs text-red-600" @click="reset">Reset ke tema</button>
  </div>
</template>

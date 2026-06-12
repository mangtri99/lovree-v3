<script setup lang="ts">
import { ref } from 'vue'
import SectionEditor from './SectionEditor.vue'
import { SECTION_TYPES, sectionRegistry, type SectionType } from '../../../server/registry/sections'

const props = defineProps<{ sections: Array<{ id: string; type: string; enabled: boolean; content: any }> }>()
const emit = defineEmits<{
  add: [SectionType]; remove: [string]; toggle: [string]; move: [{ from: number; to: number }]
  'set-field': [{ id: string; key: string; value: unknown }]
}>()
const openId = ref<string | null>(null)
const types = SECTION_TYPES
function label(t: string) { return (sectionRegistry as any)[t]?.label ?? t }
</script>
<template>
  <div class="space-y-2">
    <div v-if="!sections.length" class="rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted">
      Belum ada bagian. Mulai dengan menambahkan bagian di bawah — biasanya <strong>Hero</strong> (nama &amp; tanggal) dulu.
    </div>
    <div
      v-for="(s, i) in sections" :key="s.id"
      class="overflow-hidden rounded-lg border bg-default transition-colors"
      :class="openId === s.id ? 'border-primary' : 'border-default'">
      <div class="flex items-center gap-1 p-2" :class="openId === s.id ? 'bg-muted' : ''">
        <button
          type="button"
          class="flex flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-elevated"
          :aria-expanded="openId === s.id"
          @click="openId = openId === s.id ? null : s.id">
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 text-dimmed transition-transform duration-200"
            :class="openId === s.id ? 'rotate-90' : ''" />
          <span class="text-sm font-medium" :class="s.enabled ? 'text-default' : 'text-dimmed line-through'">{{ label(s.type) }}</span>
          <span v-if="!s.enabled" class="text-xs text-dimmed">(nonaktif)</span>
        </button>
        <div class="flex items-center gap-1">
          <UButton variant="ghost" size="xs" icon="i-lucide-arrow-up" :disabled="i === 0" @click="emit('move', { from: i, to: i - 1 })" />
          <UButton variant="ghost" size="xs" icon="i-lucide-arrow-down" :disabled="i === sections.length - 1" @click="emit('move', { from: i, to: i + 1 })" />
          <UCheckbox :model-value="s.enabled" label="aktif" @update:model-value="emit('toggle', s.id)" />
          <UButton variant="ghost" color="error" size="xs" icon="i-lucide-trash-2" @click="emit('remove', s.id)" />
        </div>
      </div>
      <div v-if="openId === s.id" class="border-t border-default p-3">
        <SectionEditor :section="s" @set-field="(p) => emit('set-field', p)" />
      </div>
    </div>
    <div class="flex flex-wrap gap-1 pt-2">
      <UButton v-for="t in types" :key="t" variant="soft" size="xs" :label="`+ ${label(t)}`" @click="emit('add', t as SectionType)" />
    </div>
  </div>
</template>

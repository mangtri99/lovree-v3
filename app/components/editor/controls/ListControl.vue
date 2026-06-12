<script setup lang="ts">
import { computed } from 'vue'
import FieldEditor from '../FieldEditor.vue'
import type { FieldEditorDescriptor } from '../../../utils/field-editors'

const props = defineProps<{ modelValue: any[]; label?: string; itemFields: Record<string, any>; defaultItem?: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [any[]] }>()

const itemEditors = computed<FieldEditorDescriptor[]>(() =>
  Object.entries(props.itemFields).map(([key, d]) => ({ key, ...(d as any) })))

function update(items: any[]) { emit('update:modelValue', items) }
function add() { update([...(props.modelValue ?? []), props.defaultItem ? { ...props.defaultItem } : {}]) }
function removeAt(i: number) { const a = [...props.modelValue]; a.splice(i, 1); update(a) }
function setItemField(i: number, key: string, value: unknown) {
  const a = props.modelValue.map((x) => ({ ...x }))
  a[i][key] = value
  update(a)
}
</script>
<template>
  <div class="text-sm">
    <span v-if="label" class="mb-1 block text-muted">{{ label }}</span>
    <div v-for="(item, i) in modelValue" :key="i" class="mb-3 rounded border border-default p-3">
      <FieldEditor
        v-for="ed in itemEditors" :key="ed.key" :descriptor="ed"
        :model-value="item[ed.key]" @update:model-value="(v) => setItemField(i, ed.key, v)" />
      <button type="button" class="mt-2 text-xs text-red-600" @click="removeAt(i)">Hapus item</button>
    </div>
    <button type="button" class="rounded border border-default px-2 py-1 text-xs text-default hover:bg-elevated" @click="add">+ Tambah</button>
  </div>
</template>

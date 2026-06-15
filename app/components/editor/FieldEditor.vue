<script setup lang="ts">
import { computed } from 'vue'
import TextControl from './controls/TextControl.vue'
import LongtextControl from './controls/LongtextControl.vue'
import DateControl from './controls/DateControl.vue'
import UrlControl from './controls/UrlControl.vue'
import YoutubeControl from './controls/YoutubeControl.vue'
import ImageControl from './controls/ImageControl.vue'
import ListControl from './controls/ListControl.vue'
import GalleryControl from './controls/GalleryControl.vue'
import DateFormatControl from './controls/DateFormatControl.vue'
import type { FieldEditorDescriptor } from '../../utils/field-editors'

const props = defineProps<{ descriptor: FieldEditorDescriptor; modelValue: any }>()
defineEmits<{ 'update:modelValue': [any] }>()

const control = computed(() => ({
  text: TextControl, longtext: LongtextControl, date: DateControl,
  url: UrlControl, youtube: YoutubeControl, image: ImageControl, list: ListControl, gallery: GalleryControl, dateformat: DateFormatControl,
} as Record<string, any>)[props.descriptor.type] ?? TextControl)
</script>
<template>
  <component
    :is="control" :label="descriptor.label" :model-value="modelValue"
    v-bind="descriptor.type === 'list' ? { itemFields: descriptor.itemFields, defaultItem: descriptor.defaultItem } : {}"
    @update:model-value="$emit('update:modelValue', $event)" />
</template>

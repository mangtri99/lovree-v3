<script setup lang="ts">
import { ref, computed } from 'vue'
import { baseTokens } from '~~/server/theme/tokens'
import { HEADING_FONTS, BODY_FONTS } from '~~/server/theme/fonts'
import { PACK_KEYS } from '~~/server/theme/validate-theme'
import ThemePreviewCard from './ThemePreviewCard.vue'

interface Theme { id?: string; name: string; key: string; tokens: any }
const props = defineProps<{ theme: Theme | null; onSubmit: (t: { name: string; key: string; tokens: any }) => void | Promise<void> }>()

const seed = props.theme ?? { name: '', key: 'base', tokens: baseTokens }
const name = ref(seed.name)
const key = ref(seed.key)
const tokens = ref(JSON.parse(JSON.stringify(seed.tokens)))

const colorKeys = ['primary', 'secondary', 'bg', 'text', 'accent'] as const
const dividerItems = ['none', 'line', 'flourish'].map((v) => ({ label: v, value: v }))
const motifItems = ['none', 'corners'].map((v) => ({ label: v, value: v }))
const headingItems = HEADING_FONTS.map((f) => ({ label: f, value: f }))
const bodyItems = BODY_FONTS.map((f) => ({ label: f, value: f }))
const keyItems = PACK_KEYS.map((p) => ({ label: p.label, value: p.value }))

const preview = computed(() => ({ id: 'preview', name: name.value || 'Pratinjau', tokens: tokens.value }))

function submit() {
  props.onSubmit({ name: name.value, key: key.value, tokens: tokens.value })
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-3 text-sm">
      <UFormField label="Nama"><UInput v-model="name" class="w-full" /></UFormField>
      <UFormField label="Layout"><USelect v-model="key" :items="keyItems" class="w-full" /></UFormField>
      <div v-for="k in colorKeys" :key="k" class="flex items-center gap-2">
        <span class="w-20 capitalize">{{ k }}</span>
        <input type="color" v-model="tokens.color[k]" :data-color="k" class="h-8 w-10" />
        <UInput v-model="tokens.color[k]" class="flex-1" />
      </div>
      <UFormField label="Font Heading"><USelect v-model="tokens.font.heading" :items="headingItems" class="w-full" /></UFormField>
      <UFormField label="Font Body"><USelect v-model="tokens.font.body" :items="bodyItems" class="w-full" /></UFormField>
      <div class="flex gap-2">
        <UFormField label="Radius sm"><UInput v-model="tokens.radius.sm" /></UFormField>
        <UFormField label="md"><UInput v-model="tokens.radius.md" /></UFormField>
        <UFormField label="lg"><UInput v-model="tokens.radius.lg" /></UFormField>
      </div>
      <UFormField label="Divider"><USelect v-model="tokens.ornament.divider" :items="dividerItems" class="w-full" /></UFormField>
      <UFormField label="Motif"><USelect v-model="tokens.ornament.motif" :items="motifItems" class="w-full" /></UFormField>
      <UButton data-save label="Simpan" @click="submit" />
    </div>
    <div>
      <p class="mb-2 text-xs text-muted">Pratinjau</p>
      <ThemePreviewCard :theme="preview" :selected="false" />
    </div>
  </div>
</template>

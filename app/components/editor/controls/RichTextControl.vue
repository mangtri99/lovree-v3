<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{ label: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      strike: false,
      orderedList: false,
      horizontalRule: false,
    }),
  ],
  onUpdate: ({ editor }) => {
    // TipTap emits '<p></p>' for an empty doc — normalize to '' so the footer fallback triggers.
    emit('update:modelValue', editor.isEmpty ? '' : editor.getHTML())
  },
})

// Keep the editor in sync if the model changes externally (e.g. section switch).
watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== (editor.value.isEmpty ? '' : editor.value.getHTML())) {
      editor.value.commands.setContent(val || '', false)
    }
  },
)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div>
    <label class="mb-1 block text-sm font-medium">{{ label }}</label>
    <ClientOnly>
      <div class="rounded border border-gray-200">
        <div v-if="editor" class="flex gap-1 border-b border-gray-200 p-1">
          <button type="button" title="Bold" aria-label="Bold" class="rounded px-2 py-1 text-sm font-bold" :class="{ 'bg-gray-200': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">B</button>
          <button type="button" title="Italic" aria-label="Italic" class="rounded px-2 py-1 text-sm italic" :class="{ 'bg-gray-200': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">I</button>
          <button type="button" title="Bullet List" aria-label="Bullet List" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-200': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">•</button>
        </div>
        <EditorContent :editor="editor" class="prose prose-sm max-w-none p-2" />
      </div>
      <template #fallback>
        <div class="rounded border border-gray-200 p-2 text-sm text-gray-400">Memuat editor…</div>
      </template>
    </ClientOnly>
  </div>
</template>

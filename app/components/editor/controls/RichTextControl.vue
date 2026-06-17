<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'

const props = defineProps<{ label: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      blockquote: false,
      codeBlock: false,
      code: false,
      strike: false,
      orderedList: false,
      horizontalRule: false,
    }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
  onUpdate: ({ editor }) => {
    // TipTap emits '<p></p>' for an empty doc — normalize to '' so the footer fallback triggers.
    emit('update:modelValue', editor.isEmpty ? '' : editor.getHTML())
  },
})

function currentHeading(): string {
  if (!editor.value) return ''
  for (const level of [1, 2, 3]) if (editor.value.isActive('heading', { level })) return String(level)
  return ''
}
function setBlock(val: string) {
  if (!editor.value) return
  if (!val) editor.value.chain().focus().setParagraph().run()
  else editor.value.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 }).run()
}

// Keep the editor in sync if the model changes externally (e.g. section switch).
watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== (editor.value.isEmpty ? '' : editor.value.getHTML())) {
      editor.value.commands.setContent(val || '', { emitUpdate: false })
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
        <div v-if="editor" class="flex flex-wrap gap-1 border-b border-gray-200 p-1">
          <button type="button" title="Bold" aria-label="Bold" class="rounded px-2 py-1 text-sm font-bold" :class="{ 'bg-gray-50/50': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">B</button>
          <button type="button" title="Italic" aria-label="Italic" class="rounded px-2 py-1 text-sm italic" :class="{ 'bg-gray-50/50': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">I</button>
          <button type="button" title="Underline" aria-label="Underline" class="rounded px-2 py-1 text-sm underline" :class="{ 'bg-gray-50/50': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">U</button>
          <select title="Paragraf/Judul" aria-label="Gaya teks" class="rounded border border-gray-200 px-1 text-sm" :value="currentHeading()" @change="setBlock(($event.target as HTMLSelectElement).value)">
            <option value="">Paragraf</option>
            <option value="1">Judul 1</option>
            <option value="2">Judul 2</option>
            <option value="3">Judul 3</option>
          </select>
          <button type="button" title="Bullet List" aria-label="Bullet List" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-50/50': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">•</button>
          <button type="button" title="Rata Kiri" aria-label="Rata Kiri" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-50/50': editor.isActive({ textAlign: 'left' }) }" @click="editor.chain().focus().setTextAlign('left').run()">⯇</button>
          <button type="button" title="Rata Tengah" aria-label="Rata Tengah" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-50/50': editor.isActive({ textAlign: 'center' }) }" @click="editor.chain().focus().setTextAlign('center').run()">▤</button>
          <button type="button" title="Rata Kanan" aria-label="Rata Kanan" class="rounded px-2 py-1 text-sm" :class="{ 'bg-gray-50/50': editor.isActive({ textAlign: 'right' }) }" @click="editor.chain().focus().setTextAlign('right').run()">⯈</button>
        </div>
        <EditorContent :editor="editor" class="richtext max-w-none p-2" />
      </div>
      <template #fallback>
        <div class="rounded border border-gray-200 p-2 text-sm text-gray-400">Memuat editor…</div>
      </template>
    </ClientOnly>
  </div>
</template>

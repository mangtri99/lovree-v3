import { reactive } from 'vue'
import { nanoid } from 'nanoid'
import { defaultContent, type SectionType } from '../../server/registry/sections'
import type { InvitationDocument } from '../../server/document/types'

export function createEditorState(initial: InvitationDocument) {
  const doc = reactive<InvitationDocument>({ sections: [...(initial.sections ?? [])] })

  function addSection(type: SectionType) {
    doc.sections.push({ id: nanoid(), type, enabled: true, content: defaultContent(type) })
  }
  function remove(id: string) {
    const i = doc.sections.findIndex((s) => s.id === id)
    if (i >= 0) doc.sections.splice(i, 1)
  }
  function toggle(id: string) {
    const s = doc.sections.find((x) => x.id === id)
    if (s) s.enabled = !s.enabled
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= doc.sections.length) return
    const removed = doc.sections.splice(from, 1)
    if (removed[0]) doc.sections.splice(to, 0, removed[0])
  }
  function setField(id: string, key: string, value: unknown) {
    const s = doc.sections.find((x) => x.id === id)
    if (s) (s.content as any)[key] = value
  }
  return { doc, addSection, remove, toggle, move, setField }
}

export function useInvitationEditor(initial: InvitationDocument) {
  return createEditorState(initial)
}

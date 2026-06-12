import { sectionRegistry, type SectionType, type FieldDescriptor } from '../../server/registry/sections'

export interface FieldEditorDescriptor extends FieldDescriptor { key: string }

export function deriveFieldEditors(type: SectionType): FieldEditorDescriptor[] {
  const def = (sectionRegistry as any)[type]
  if (!def?.fields) return []
  return Object.entries(def.fields).map(([key, d]) => ({ key, ...(d as FieldDescriptor) }))
}

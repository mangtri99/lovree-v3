import type { SectionType } from '../registry/sections'

export interface DocumentSection {
  id: string
  type: SectionType
  enabled: boolean
  content: any
}
export interface InvitationDocument {
  sections: DocumentSection[]
}

// Decide whether the editor should adopt the server-normalized sections after a
// draft PATCH. Returns the sections to adopt, or null to leave the store as-is.
//
// Loop safety: edit.vue watches editor.doc deeply, so adopting fires the watcher
// and schedules another save. We adopt ONLY when the server result differs from
// what's in the store; an identical adopt is skipped, so the one extra save
// returns identical sections and the cycle converges instead of hanging.
export function reconcileSections(
  sentDocJson: string,
  currentDoc: { sections: unknown[] },
  serverSections: unknown[],
): unknown[] | null {
  // An edit landed during the request — let the pending debounce re-save/re-reconcile.
  if (JSON.stringify(currentDoc) !== sentDocJson) return null
  // Server normalized to the same thing — nothing to adopt (and adopting would loop).
  if (JSON.stringify(serverSections) === JSON.stringify(currentDoc.sections)) return null
  return serverSections
}

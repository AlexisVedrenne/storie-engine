// Translation overrides for text authored inside files that are SHARED
// with the shipped game (src/engine/events/triggers.js, a plug-in app's
// entryType.js under src/components/apps/) — those files can never import
// src/editor/i18n directly (see [[storie-engine-build-boundary]] memory:
// it would break every future build the same way EmailEntryForm.vue's old
// @/editor import did). Instead the ORIGINAL text there stays the
// fallback, and the editor UI looks up a translation here first, keyed by
// the trigger name / entry type — same "dictionary first, authored text
// as fallback" shape as everywhere else, just entered from the other side.
import { editorTOptionalPath } from './index.js'

// Array-based lookups, not dot-joined strings — trigger names (e.g.
// 'photo.viewed', 'app.closed') contain literal dots themselves, which a
// string path like `triggers.${name}.label` can't tell apart from nested
// segments (see editorTOptionalPath's own comment). Entry type names don't
// currently contain dots, but the same array form is used for consistency
// and to not depend on that staying true.
export function triggerLabel(trigger) {
  if (!trigger) return ''
  return editorTOptionalPath(['triggers', trigger.name, 'label']) ?? trigger.label
}

export function matchFieldLabel(triggerName, field) {
  return editorTOptionalPath(['triggers', triggerName, 'fields', field.key, 'label']) ?? field.label
}

export function entryTypeLabel(def) {
  if (!def) return ''
  return editorTOptionalPath(['entryTypes', def.type, 'label']) ?? def.label
}

export function entryTypeHelp(def) {
  if (!def) return ''
  return editorTOptionalPath(['entryTypes', def.type, 'help']) ?? def.help
}

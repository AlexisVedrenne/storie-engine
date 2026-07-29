import { APP_REGISTRY } from '@/engine/apps/registry'
import { CUSTOM_ENTRY_TYPES } from '@/engine/apps/entryTypeRegistry'

// Derived from the auto-discovered registry (see registry.js) rather than a
// separate hand-typed list — a contributed app module needs zero edits here
// to count as "enabled by default" in story.js's enabledAppIds getter.
export const ALL_APP_IDS = APP_REGISTRY.map((app) => app.id)

// Which app a timeline entry type belongs to — used both to hide a type from
// TimelineEditor.vue's "add entry" picker and to have story.js's advance()
// silently skip an ALREADY-AUTHORED entry of that type at runtime (same
// silent-skip treatment as a failed `requires`) when its app is disabled, so
// disabling an app doesn't leave dead SMS/posts/etc. still playing out for
// content nothing on screen can show. A type absent here (choice, effect,
// timeskip) is structural, not tied to one app — never skipped this way.
// The spread merges in every plug-in entry type's own `app` field
// (entryTypeRegistry.js) — this one map is the ONLY place a plug-in type
// needs to register itself to get both behaviors for free, no separate
// wiring in TimelineEditor.vue or story.js.
export const ENTRY_TYPE_APP = {
  message: 'messages',
  dm: 'social',
  post: 'social',
  story: 'social',
  reel: 'social',
  photo: 'gallery',
  call: 'calls',
  ...Object.fromEntries(CUSTOM_ENTRY_TYPES.map((def) => [def.type, def.app])),
}

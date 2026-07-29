// Single literal list of the phone's built-in app ids — registry.js (icons/
// components) and story.js's enabledAppIds getter both derive from this one
// array instead of each re-typing the 5 ids themselves, so adding/removing a
// built-in app only ever means editing it in one place.
export const ALL_APP_IDS = ['messages', 'social', 'gallery', 'calls', 'settings']

// Which app a timeline entry type belongs to — used both to hide a type from
// TimelineEditor.vue's "add entry" picker and to have story.js's advance()
// silently skip an ALREADY-AUTHORED entry of that type at runtime (same
// silent-skip treatment as a failed `requires`) when its app is disabled, so
// disabling an app doesn't leave dead SMS/posts/etc. still playing out for
// content nothing on screen can show. A type absent here (choice, effect,
// timeskip) is structural, not tied to one app — never skipped this way.
export const ENTRY_TYPE_APP = {
  message: 'messages',
  dm: 'social',
  post: 'social',
  story: 'social',
  reel: 'social',
  photo: 'gallery',
  call: 'calls',
}

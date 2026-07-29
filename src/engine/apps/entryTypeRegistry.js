// Auto-discovers plug-in timeline entry types, mirroring registry.js's app
// auto-discovery — ANY app folder that also ships an entryType.js
// (default-exporting the shape below) gets a fully scriptable timeline
// entry type with ZERO edits to story.js / TimelineEditor.vue /
// extractTranslatableStrings.js / appIds.js: each of those has exactly ONE
// additive fallback reading this registry, added on top of its existing
// hardcoded switch — never inside it.
//
// The 10 built-in types (message, dm, choice, post, photo, story, reel,
// call, effect, timeskip) stay entirely hardcoded and untouched, on
// purpose (see docs/roadmap-modular-apps-events.md): they encode delicate
// pacing/blocking mechanics — typing-delay scheduling, blocking on player
// input, a multi-stage timeskip cinematic — that a new content type
// realistically doesn't need to reinvent. A plug-in type instead gets the
// same "instant, then a pacing delay" treatment post/photo/story/reel/
// effect already get — covers real cases like a received email/note/etc.
// If a future type genuinely needs typing-delay or blocking, that's a
// deliberate, separate extension of this contract, not assumed here.
//
// Contract a `entryType.js` default-exports:
//   type            — the entry.type value this defines (unique)
//   app             — which app id this belongs to (drives hiding the type
//                      from TimelineEditor's add-picker + runtime-skipping
//                      already-authored entries, exactly like the 7 built-in
//                      types already do via appIds.js's ENTRY_TYPE_APP)
//   icon            — Material icon name, shown in the timeline + add-picker
//   label           — shown in the "Ajouter une entrée…" dropdown
//   help            — one-line plain-language description above the form
//   form            — Vue component authoring this entry's fields
//   defaultEntry(ctx)        — ctx = { firstContactId() } — returns a fresh entry
//   process(entry, ctx)      — ctx = { story, chapter } — the actual runtime
//                              side effect (story is the full Pinia store
//                              instance: story.fill(), story.pushNotification(),
//                              story.customData, etc. are all available,
//                              same as any built-in type's processEntry case)
//   extractText(entry)       — optional, returns string[] of translatable text
//   collectReferences(entry) — optional, returns {kind:'contact'|'thread', id}[]
const entryTypeModules = import.meta.glob('/src/components/apps/*/entryType.js', { eager: true })

export const CUSTOM_ENTRY_TYPES = Object.values(entryTypeModules)
  .map((mod) => mod.default)
  .filter(Boolean)

export const CUSTOM_ENTRY_TYPE_BY_TYPE = Object.fromEntries(
  CUSTOM_ENTRY_TYPES.map((def) => [def.type, def]),
)

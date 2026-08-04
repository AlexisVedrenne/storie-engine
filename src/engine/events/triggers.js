// Central catalog of every trigger the engine can emit — single source of
// truth for eventManager.js's subscription list AND EventList.vue/
// EventForm.vue's per-app grouping, labels, and match-field pickers. Adding
// a real trigger (a new emit() call site somewhere in engine code) means
// adding ONE entry here; nothing else needs updating.
//
// `app` groups this trigger under one of APP_REGISTRY's ids in the Events
// tab's "add" menu — `null` means "Commun": cross-app triggers (opening
// ANY app, staying in ANY app a while) get their own top-level group
// instead of being repeated under every single app.
//
// `matchFields` — array (usually 1, `app.closed` has 2) of
// { key, label, optionsFrom?, combobox?, numeric? }, each an optional
// filter on that payload key:
//   - optionsFrom: 'apps' (→ APP_REGISTRY), 'contacts' (→ the project's own
//     contacts), 'photos' (→ collectPhotoOptions.js), or 'posts' (→
//     collectPostOptions.js) when the valid values come from the loaded
//     project rather than free text.
//   - combobox: true (only meaningful with optionsFrom) — the picker also
//     accepts typing a value NOT in the list, for content the author
//     hasn't authored yet (a photo/post they plan to add later, already
//     knowing its id/path). Apps and contacts never get this — the set of
//     apps and contacts is always fully known up front, there's no
//     "future contact" concept.
//   - numeric: true means this field is a MINIMUM threshold (payload value
//     ≥ the authored one), not an exact match — e.g. "at least 30 seconds
//     spent in the app", not "exactly 30". See matchEvent.js.
export const TRIGGERS = [
  {
    name: 'app.opened',
    app: null,
    label: 'Application ouverte',
    matchFields: [{ key: 'app', label: 'Application', optionsFrom: 'apps' }],
  },
  {
    name: 'app.closed',
    app: null,
    label: 'Application quittée (délai passé dedans)',
    matchFields: [
      { key: 'app', label: 'Application', optionsFrom: 'apps' },
      { key: 'seconds', label: 'Temps minimum (secondes)', numeric: true },
    ],
  },
  {
    name: 'photo.viewed',
    app: 'gallery',
    label: 'Photo consultée',
    matchFields: [{ key: 'url', label: 'Photo', optionsFrom: 'photos', combobox: true }],
  },
  {
    name: 'post.liked',
    app: 'social',
    label: 'Publication likée',
    matchFields: [
      { key: 'authorId', label: 'Auteur de la publication', optionsFrom: 'contacts' },
      { key: 'postId', label: 'Publication (id)', optionsFrom: 'posts', combobox: true },
    ],
  },
  {
    name: 'contact.followed',
    app: 'social',
    label: 'Contact suivi',
    matchFields: [{ key: 'contactId', label: 'Contact', optionsFrom: 'contacts' }],
  },
  {
    name: 'profile.opened',
    app: 'social',
    label: 'Profil ouvert',
    matchFields: [{ key: 'contactId', label: 'Contact', optionsFrom: 'contacts' }],
  },
  {
    name: 'conversation.opened',
    app: 'messages',
    label: 'Conversation ouverte',
    matchFields: [{ key: 'contactId', label: 'Contact', optionsFrom: 'contacts' }],
  },
  {
    name: 'interaction.won',
    app: null,
    label: 'Interaction gagnée',
    matchFields: [{ key: 'interactionId', label: 'Interaction', optionsFrom: 'interactions' }],
  },
  {
    name: 'interaction.lost',
    app: null,
    label: 'Interaction perdue',
    matchFields: [{ key: 'interactionId', label: 'Interaction', optionsFrom: 'interactions' }],
  },
]

export const ENGINE_TRIGGERS = TRIGGERS.map((t) => t.name)

export function triggerDef(name) {
  return TRIGGERS.find((t) => t.name === name) || null
}

export function commonTriggers() {
  return TRIGGERS.filter((t) => t.app === null)
}

export function triggersForApp(appId) {
  return TRIGGERS.filter((t) => t.app === appId)
}

// Project-wide search — one result per matching chapter/contact/thread/
// custom app/event/automation/interaction/entity schema/flag. Deliberately
// reuses EditorPage.vue's
// existing `navigateToResource(descriptor, navHint)` (added for the global
// undo/redo feature) for click-to-navigate rather than inventing new
// navigation — which also means results share its exact granularity limit:
// chapter/list/app/game-tab level, never a specific timeline entry/row
// within one (there is no descriptor param for that, see
// navigateToResource's own comments in EditorPage.vue). A result tells you
// WHICH chapter/app/etc. to look in, not the exact line — landing on the
// right chapter is still a large improvement over no search at all, and
// pretending otherwise (e.g. one result per matching timeline entry) would
// overclaim precision this navigation layer can't deliver.
//
// Matches FR source text only, not per-locale translations — no existing
// walker enumerates every (locale, bucket) pair project-wide (only
// I18nBucketEditor.vue's own search does, scoped to whichever one is
// currently open), and FR is always current (the canonical source, every
// other locale a translation of it) — an accepted v1 scope limit, not an
// oversight.
//
// Pure, no Pinia dependency — same leaf-module convention as
// findReferences.js/validateProject.js.
import { extractTranslatableStrings, addBlockStrings } from './extractTranslatableStrings'
import { collectFlags } from './collectFlags'

function norm(s) {
  return (s || '').toLowerCase()
}

function matches(query, ...fields) {
  return norm(fields.filter(Boolean).join(' \n ')).includes(query)
}

// @param project - story.project: {chapters, contacts, threads, customApps,
//   gameConfig, ...}
// @param query - raw search text (case-insensitive substring match)
// @returns [{ kind, label, context, descriptor, navHint? }]
export function searchProject(project, query) {
  const q = norm(query).trim()
  if (!q || !project) return []
  const results = []

  // Chapters — title + every text field extractTranslatableStrings already
  // knows how to pull out of a timeline (message/dm/choice/post/.../plug-in
  // entry types via extractText), reused as-is rather than re-deriving the
  // same per-type field list a second time.
  const chapterBuckets = extractTranslatableStrings(project)
  for (const chapter of project.chapters || []) {
    if (matches(q, chapter.title || chapter.id, ...(chapterBuckets[chapter.id] || []))) {
      results.push({
        kind: 'chapter',
        label: chapter.title || chapter.id,
        context: 'Chapitre',
        descriptor: { kind: 'chapter', id: chapter.id },
      })
    }
  }

  for (const contact of project.contacts || []) {
    if (matches(q, contact.name, contact.bio, contact.pseudo, contact.id)) {
      results.push({
        kind: 'contact',
        label: contact.name || contact.id,
        context: 'Contact',
        descriptor: { kind: 'contacts' },
      })
    }
  }

  for (const thread of project.threads || []) {
    // A 1:1 thread has no name of its own (see story.js's findThread
    // fallback) — nothing here to match beyond the contact, already
    // searched above.
    if (!thread.group) continue
    if (matches(q, thread.name, thread.id)) {
      results.push({
        kind: 'thread',
        label: thread.name || thread.id,
        context: 'Groupe',
        descriptor: { kind: 'threads' },
      })
    }
  }

  for (const app of project.customApps || []) {
    const blockText = new Set()
    for (const screen of app.screens || []) addBlockStrings(screen.blocks, blockText)
    if (matches(q, app.label, app.id, ...blockText)) {
      results.push({
        kind: 'app',
        label: app.label || app.id,
        context: 'App custom',
        descriptor: { kind: 'app', id: app.id },
      })
    }
  }

  ;(project.gameConfig?.events || []).forEach((event, i) => {
    if (matches(q, event.title, event.trigger)) {
      results.push({
        kind: 'event',
        label: event.title || event.trigger || 'Event',
        context: 'Event',
        descriptor: { kind: 'game' },
        navHint: { viewMode: 'events', eventIndex: i },
      })
    }
  })

  // Automations — same id/label/requires/action/repeat shape as Events
  // above (AutomationList.vue's own comment: "mirrors EntitySchemaList.vue's
  // own list/select/create/delete shape exactly"), and the two are
  // presented as one merged "Réactions" tab in the UI (EditorPage.vue) —
  // omitting this loop left half of that tab's content unsearchable.
  ;(project.gameConfig?.automations || []).forEach((def, i) => {
    if (matches(q, def.label, def.id)) {
      results.push({
        kind: 'automation',
        label: def.label || def.id,
        context: 'Automatisation',
        descriptor: { kind: 'game' },
        navHint: { viewMode: 'automations', automationIndex: i },
      })
    }
  })

  ;(project.gameConfig?.interactions || []).forEach((def, i) => {
    if (matches(q, def.name, def.id)) {
      results.push({
        kind: 'interaction',
        label: def.name || def.id,
        context: 'Interaction',
        descriptor: { kind: 'game' },
        navHint: { viewMode: 'interactions', interactionIndex: i },
      })
    }
  })

  // Entity schemas — a growing catalog once a project uses custom data
  // types (EntitySchemaForm.vue), previously invisible to search entirely.
  ;(project.gameConfig?.entitySchemas || []).forEach((def, i) => {
    const fieldLabels = (def.fields || []).flatMap((f) => [f.label, f.key])
    if (matches(q, def.label, def.id, ...fieldLabels)) {
      results.push({
        kind: 'entitySchema',
        label: def.label || def.id,
        context: 'Schéma',
        descriptor: { kind: 'game' },
        navHint: { viewMode: 'schemas', schemaIndex: i },
      })
    }
  })

  for (const flag of collectFlags(project)) {
    if (matches(q, flag.key, flag.label)) {
      results.push({
        kind: 'flag',
        label: flag.label || flag.key,
        context: 'Flag',
        // No navigable descriptor — the flags catalog is a dialog opened
        // from any chapter (EditorPage.vue's flagsDialogOpen), not a
        // viewMode/selection combination navigateToResource understands.
        // The UI layer opens that dialog directly for a 'flag' result.
        descriptor: null,
      })
    }
  }

  return results
}

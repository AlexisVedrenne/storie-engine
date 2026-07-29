// Project-wide flag catalog — every flag name referenced anywhere in
// `requires.flags`/`effects.flags` (chapters, chapter-graph edges, choice
// options and their nested `then`, and events + their own `then`), plus
// for each one the range of values it's actually been set to by an
// authored EFFECT anywhere, and WHERE it's referenced (which chapters/
// events). Pure, no store dependency — same leaf-module convention as
// collectPhotoOptions.js/collectPostOptions.js. Distinct from story.js's
// runtime `state.flags` (the actual accumulated value at play time) —
// this only reports what the author has typed.
//
// Condition values (`requires.flags`, e.g. a `{min: 3}` threshold on a
// graph edge) are deliberately EXCLUDED from the numeric range: a
// condition is a check against the flag, not a value it's ever set to —
// folding both into one min/max previously made a flag that's only ever
// checked with `>= 3` and never modified anywhere read as "observed
// between 3 and 3", which looks like real data but isn't. A flag that's
// checked somewhere but never modified by any effect is surfaced instead
// as `neverModified: true` — almost certainly an authoring oversight.
// Relative, not '@/...' — this stays a plain-Node-runnable leaf module
// (no bundler alias resolution needed), same as every collectFlags.js
// verification run during development.
import { triggerDef } from '../engine/events/triggers.js'

function noteFlags(container, kind, samples, location) {
  if (!container?.flags) return
  for (const [key, value] of Object.entries(container.flags)) {
    if (!samples.has(key)) {
      samples.set(key, {
        count: 0,
        hasCondition: false,
        conditionBoolean: false,
        effectBoolean: false,
        effectNumbers: [],
        locations: new Map(), // `${type}:${id}` -> { type, label, count }
      })
    }
    const entry = samples.get(key)
    entry.count++
    if (kind === 'requires') {
      entry.hasCondition = true
      if (typeof value === 'boolean') entry.conditionBoolean = true
    } else if (kind === 'effects') {
      if (typeof value === 'boolean') entry.effectBoolean = true
      else if (typeof value === 'number') entry.effectNumbers.push(value)
    }
    if (location) {
      const locKey = `${location.type}:${location.id}`
      if (!entry.locations.has(locKey)) entry.locations.set(locKey, { type: location.type, label: location.label, count: 0 })
      entry.locations.get(locKey).count++
    }
  }
}

function walkTimeline(timeline, samples, location) {
  for (const entry of timeline || []) {
    noteFlags(entry.requires, 'requires', samples, location)
    if (entry.type === 'effect') noteFlags(entry.effects, 'effects', samples, location)
    if (entry.type === 'choice') {
      for (const option of entry.options || []) {
        noteFlags(option.requires, 'requires', samples, location)
        noteFlags(option.effects, 'effects', samples, location)
        walkTimeline(option.then, samples, location)
      }
    }
  }
}

export function collectFlags(project) {
  const samples = new Map()

  for (const chapter of project?.chapters || []) {
    const loc = { type: 'chapter', id: chapter.id, label: chapter.title || chapter.id }
    noteFlags(chapter.requires, 'requires', samples, loc) // legacy field, no longer authored, still scanned for old projects
    // Edges belong to the chapter they originate FROM — grouped under that
    // same chapter location rather than a separate "edge" kind, since
    // that's where the author would go to find/edit it.
    for (const link of chapter.next || []) noteFlags(link.requires, 'requires', samples, loc)
    walkTimeline(chapter.timeline, samples, loc)
  }
  for (const [i, event] of (project?.gameConfig?.events || []).entries()) {
    const loc = { type: 'event', id: i, label: event.title || triggerDef(event.trigger)?.label || event.trigger || 'Event' }
    noteFlags(event.requires, 'requires', samples, loc)
    noteFlags(event.effects, 'effects', samples, loc)
    walkTimeline(event.then, samples, loc)
  }

  const labels = project?.gameConfig?.flags || {}
  // A flag can have a saved label but zero hits in the scan above — e.g.
  // the author renamed/removed every `requires`/`effects` reference to it
  // but the game.flags[key] label entry was never cleaned up. Surface
  // those too (isUsed: false) instead of silently hiding them, so the
  // catalog is also where that leftover metadata gets noticed and deleted.
  const allKeys = new Set([...samples.keys(), ...Object.keys(labels)])

  return [...allKeys]
    .map((key) => {
      const s = samples.get(key)
      const hasEffect = !!s && (s.effectNumbers.length > 0 || s.effectBoolean)
      return {
        key,
        label: labels[key]?.label || '',
        count: s?.count || 0,
        isUsed: !!s,
        isBoolean: !!s && (s.conditionBoolean || s.effectBoolean),
        isNumeric: !!s && s.effectNumbers.length > 0,
        min: s && s.effectNumbers.length ? Math.min(...s.effectNumbers) : null,
        max: s && s.effectNumbers.length ? Math.max(...s.effectNumbers) : null,
        // Checked by a condition somewhere but no effect anywhere ever sets
        // it — the exact shape of "I wrote `>= 3` on an edge and forgot to
        // ever actually add to the flag".
        neverModified: !!s && s.hasCondition && !hasEffect,
        locations: s ? [...s.locations.values()].sort((a, b) => a.label.localeCompare(b.label)) : [],
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

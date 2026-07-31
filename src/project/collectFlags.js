// Project-wide flag catalog — every flag name referenced anywhere in
// `requires.flags`/`effects.flags` (chapters, chapter-graph edges, choice
// options and their nested `then`, and events + their own `then`), plus
// for each one the highest and lowest value it could actually REACH by
// playing through the story (see computeFlagRange below), and WHERE it's
// referenced (which chapters/events). Pure, no store dependency — same
// leaf-module convention as collectPhotoOptions.js/collectPostOptions.js.
// Distinct from story.js's runtime `state.flags` (the actual accumulated
// value during one specific playthrough) — this reports the full possible
// range across every path, computed statically from authored data.
//
// Condition values (`requires.flags`, e.g. a `{min: 3}` threshold on a
// graph edge) never contribute to the range directly: a condition is a
// check against the flag, not a value it's ever set to. A flag that's
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

// The highest/lowest total a flag could reach by playing the story from
// its entry chapter (manifest.entryChapterId, falling back to the first
// chapter — same rule story.js's own boot uses) through to any ending.
// A `choice` is a branch: only ONE option is ever taken in a single
// playthrough, so its contribution is the best/worst across its options,
// not their sum. `chapter.next[]` is the same kind of branch at the
// chapter level. Everything else (message/post/photo/...) never carries
// an effect on this flag and is skipped.
//
// Deliberately optimistic: it ignores `requires` gating on entries/edges
// (whether THAT particular branch is actually reachable depends on other
// flags' state, which would mean solving the whole project's flags
// together, not one at a time) — so this is an outer bound, "the most
// this flag could ever reach if every branch that touches it turned out
// to be reachable", not a guarantee some single playthrough hits it
// exactly. Still far more useful than the flag's own individual authored
// deltas (which is what this used to show, and read as a false "observed
// range" — see git history).
function computeFlagRange(project, flagKey) {
  const chapters = project?.chapters || []
  if (!chapters.length) return { min: 0, max: 0 }
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const startId = project?.manifest?.entryChapterId || chapters[0].id

  function deltaOf(entry) {
    const v = entry.effects?.flags?.[flagKey]
    return typeof v === 'number' ? v : 0
  }

  // [min, max] additional delta achievable by playing through this flat
  // entries array (a chapter's timeline, or a choice option's `then`)
  // start to finish.
  function walkEntries(entries) {
    let min = 0
    let max = 0
    for (const entry of entries || []) {
      if (entry.type === 'effect') {
        const d = deltaOf(entry)
        min += d
        max += d
      } else if (entry.type === 'choice' && entry.options?.length) {
        let optMin = Infinity
        let optMax = -Infinity
        for (const option of entry.options) {
          const [a, b] = walkEntries(option.then)
          if (a < optMin) optMin = a
          if (b > optMax) optMax = b
        }
        min += optMin
        max += optMax
      }
    }
    return [min, max]
  }

  // Memoized by chapter id alone — the additional delta reachable FROM a
  // chapter onward never depends on how much the flag already accumulated
  // getting there, so this is safe regardless of how many different paths
  // lead into the same chapter.
  const memo = new Map()
  const inProgress = new Set() // cycle guard — a revisited chapter within
  // the current DFS stack contributes nothing further (0) rather than
  // recursing forever; chapter graphs are expected to be acyclic, but
  // nothing stops an author from wiring a loop.
  function chapterRange(id) {
    if (memo.has(id)) return memo.get(id)
    if (inProgress.has(id) || !chapterById.has(id)) return [0, 0]
    inProgress.add(id)
    const chapter = chapterById.get(id)
    const [selfMin, selfMax] = walkEntries(chapter.timeline)
    const edges = chapter.next || []
    let nextMin = 0
    let nextMax = 0
    if (edges.length) {
      let worst = Infinity
      let best = -Infinity
      for (const edge of edges) {
        const [a, b] = chapterRange(edge.to)
        if (a < worst) worst = a
        if (b > best) best = b
      }
      nextMin = worst
      nextMax = best
    }
    const result = [selfMin + nextMin, selfMax + nextMax]
    inProgress.delete(id)
    memo.set(id, result)
    return result
  }

  const [min, max] = chapterRange(startId)
  return { min, max }
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
      const isNumeric = !!s && s.effectNumbers.length > 0
      const range = isNumeric ? computeFlagRange(project, key) : null
      return {
        key,
        label: labels[key]?.label || '',
        count: s?.count || 0,
        isUsed: !!s,
        isBoolean: !!s && (s.conditionBoolean || s.effectBoolean),
        isNumeric,
        min: range?.min ?? null,
        max: range?.max ?? null,
        // Checked by a condition somewhere but no effect anywhere ever sets
        // it — the exact shape of "I wrote `>= 3` on an edge and forgot to
        // ever actually add to the flag".
        neverModified: !!s && s.hasCondition && !hasEffect,
        locations: s ? [...s.locations.values()].sort((a, b) => a.label.localeCompare(b.label)) : [],
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

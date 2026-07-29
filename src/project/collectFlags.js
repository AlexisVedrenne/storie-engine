// Project-wide flag catalog — every flag name referenced anywhere in
// `requires.flags`/`effects.flags` (chapters, chapter-graph edges, choice
// options and their nested `then`, and events + their own `then`), plus
// for each one every numeric value ever authored against it (exact-match
// conditions, `{min}`/`{max}` range bounds, effect deltas). Pure, no store
// dependency — same leaf-module convention as collectPhotoOptions.js/
// collectPostOptions.js. Distinct from story.js's runtime `state.flags`
// (the actual accumulated values at play time) — this only reports what
// the AUTHOR has typed, to help spot the range they've been assuming a
// numeric flag stays within.
function noteFlags(container, samples) {
  if (!container?.flags) return
  for (const [key, value] of Object.entries(container.flags)) {
    if (!samples.has(key)) samples.set(key, { count: 0, booleans: false, numbers: [] })
    const entry = samples.get(key)
    entry.count++
    if (typeof value === 'boolean') {
      entry.booleans = true
    } else if (typeof value === 'number') {
      entry.numbers.push(value)
    } else if (value && typeof value === 'object') {
      if (typeof value.min === 'number') entry.numbers.push(value.min)
      if (typeof value.max === 'number') entry.numbers.push(value.max)
    }
  }
}

function walkTimeline(timeline, samples) {
  for (const entry of timeline || []) {
    noteFlags(entry.requires, samples)
    if (entry.type === 'effect') noteFlags(entry.effects, samples)
    if (entry.type === 'choice') {
      for (const option of entry.options || []) {
        noteFlags(option.requires, samples)
        noteFlags(option.effects, samples)
        walkTimeline(option.then, samples)
      }
    }
  }
}

export function collectFlags(project) {
  const samples = new Map()

  for (const chapter of project?.chapters || []) {
    noteFlags(chapter.requires, samples) // legacy field, no longer authored, still scanned for old projects
    for (const link of chapter.next || []) noteFlags(link.requires, samples)
    walkTimeline(chapter.timeline, samples)
  }
  for (const event of project?.gameConfig?.events || []) {
    noteFlags(event.requires, samples)
    noteFlags(event.effects, samples)
    walkTimeline(event.then, samples)
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
      return {
        key,
        label: labels[key]?.label || '',
        count: s?.count || 0,
        isUsed: !!s,
        isBoolean: s?.booleans || false,
        isNumeric: !!s && s.numbers.length > 0,
        min: s && s.numbers.length ? Math.min(...s.numbers) : null,
        max: s && s.numbers.length ? Math.max(...s.numbers) : null,
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

// Pure matching logic for authored reaction entries (game.events, see
// GameForm.vue / docs/roadmap-modular-apps-events.md) against a live
// (trigger, payload) pair from eventManager.js — split out from story.js so
// it's testable with a plain Node script, no Pinia/Vue setup needed, same
// reasoning as docs/phase5-plan.md's own "tested in Node standalone" note.

// `match` is an optional shallow subset filter: every key in it must equal
// the corresponding key in the emitted payload. Absent/empty `match` means
// "any payload for this trigger" — e.g. react to ANY photo being viewed,
// not just one specific id.
function payloadMatches(match, payload) {
  if (!match) return true
  return Object.entries(match).every(([key, value]) => (payload || {})[key] === value)
}

export function findMatchingEvents(events, trigger, payload) {
  return (events || []).filter((evt) => evt.trigger === trigger && payloadMatches(evt.match, payload))
}

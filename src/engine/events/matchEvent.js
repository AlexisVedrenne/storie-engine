// Pure matching logic for authored reaction entries (game.events, see
// GameForm.vue / docs/roadmap-modular-apps-events.md) against a live
// (trigger, payload) pair from eventManager.js — split out from story.js so
// it's testable with a plain Node script, no Pinia/Vue setup needed, same
// reasoning as docs/phase5-plan.md's own "tested in Node standalone" note.
import { triggerDef } from '@/engine/events/triggers'

// `match` is an optional shallow filter: every key in it must satisfy the
// corresponding payload key. Absent/empty `match` means "any payload for
// this trigger" — e.g. react to ANY photo being viewed, not just one
// specific url. A field flagged `numeric` in the trigger's own definition
// (triggers.js) is a MINIMUM threshold (payload ≥ authored value) instead
// of exact equality — e.g. "at least 30 seconds", not "exactly 30".
function payloadMatches(trigger, match, payload) {
  if (!match) return true
  const fields = triggerDef(trigger)?.matchFields || []
  return Object.entries(match).every(([key, value]) => {
    const actual = (payload || {})[key]
    const field = fields.find((f) => f.key === key)
    if (field?.numeric) return typeof actual === 'number' && actual >= value
    return actual === value
  })
}

export function findMatchingEvents(events, trigger, payload) {
  return (events || []).filter((evt) => evt.trigger === trigger && payloadMatches(trigger, evt.match, payload))
}

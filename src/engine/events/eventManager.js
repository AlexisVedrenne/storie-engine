// Minimal pub/sub bus — the "EventManager" from
// docs/roadmap-modular-apps-events.md, kept deliberately small: it only
// dispatches, it doesn't know anything about requires/effects/timeline
// entries (see story.js's handleEngineEvent, which reuses
// checkConditions/applyEffects/runThen instead of reinventing a second
// narrative system — the roadmap's own §5 principle).
//
// Plain module-level state, not a Pinia store — nothing here needs to be
// reactive, and it's imported from phone.js as well as story.js; a
// store-to-store dependency between those two would be a needless
// init-order risk for something this small.
const listeners = new Map() // eventName -> Set<handler>

export function on(eventName, handler) {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set())
  listeners.get(eventName).add(handler)
  return () => off(eventName, handler)
}

export function off(eventName, handler) {
  listeners.get(eventName)?.delete(handler)
}

export function emit(eventName, payload) {
  for (const handler of listeners.get(eventName) || []) handler(payload)
}

// Removes every listener for every event — called by story.js's
// loadProject() right before it re-subscribes, so switching projects (or
// the editor's live preview reloading the same one) never accumulates
// duplicate handlers that would fire an authored reaction N times after N
// reloads.
export function clear() {
  listeners.clear()
}

// Every trigger name the engine itself ever emits — the fixed vocabulary a
// project's authored `gameConfig.events[].trigger` can match against.
// Adding a new one is a deliberate engine-level change (a new emit() call
// site somewhere), the same weight as adding a built-in app or entry type —
// not something project data can invent on its own.
export const ENGINE_TRIGGERS = ['app.opened', 'photo.viewed']

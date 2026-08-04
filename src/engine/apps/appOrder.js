import { APP_REGISTRY } from './registry'

// Reorders a full app list (built-ins, plus any author-built custom apps —
// see story.js's `mergedAppRegistry` getter) by a project's saved
// `game.appOrder` (an array of app ids, see GameForm.vue's draggable
// Applications panel) — single source of truth for every consumer that
// displays "the" app order: the phone home screen grid (HomeScreen.vue),
// the setup wizard's sync animation (SetupWizard.vue), and the editor's own
// Applications panel.
// Any id in the saved order that no longer matches a real app is dropped;
// any app NOT yet in the saved order (a newly-added built-in/custom app, or
// a fresh project that's never touched this) is appended after, in its own
// declared `order` — so nothing ever silently disappears just because it
// was added after the project last saved a custom order.
// `fullList` defaults to APP_REGISTRY (built-ins only) for callers that
// don't have a project's custom apps to merge in.
export function orderedAppList(fullList = APP_REGISTRY, appOrder) {
  if (!appOrder?.length) return fullList
  const remaining = new Map(fullList.map((app) => [app.id, app]))
  const ordered = []
  for (const id of appOrder) {
    const app = remaining.get(id)
    if (app) {
      ordered.push(app)
      remaining.delete(id)
    }
  }
  ordered.push(...remaining.values())
  return ordered
}

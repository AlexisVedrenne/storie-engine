import { APP_REGISTRY } from './registry'

// Reorders APP_REGISTRY by a project's saved `game.appOrder` (an array of
// app ids, see GameForm.vue's draggable Applications panel) — single
// source of truth for every consumer that displays "the" app order: the
// phone home screen grid (HomeScreen.vue), the setup wizard's sync
// animation (SetupWizard.vue), and the editor's own Applications panel.
// Any id in the saved order that no longer matches a real app is dropped;
// any app NOT yet in the saved order (a newly-added built-in, or a fresh
// project that's never touched this) is appended after, in its own
// manifest-declared `order` — so nothing ever silently disappears just
// because it was added after the project last saved a custom order.
export function orderedAppList(appOrder) {
  if (!appOrder?.length) return APP_REGISTRY
  const remaining = new Map(APP_REGISTRY.map((app) => [app.id, app]))
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

// Pure route-tree helpers — same leaf-module convention as
// findReferences.js/validateProject.js (no Pinia dependency, usable from a
// plain confirm-delete flow or a picker's options computation). Routes form
// a parent/child tree via `route.parentId` (see docs: routes are editor-only
// organization, no engine meaning).

export function childrenOf(routes, parentId) {
  return (routes || []).filter((r) => (r.parentId || null) === (parentId || null))
}

// Transitive descendants of `id` — used to keep a route from being set as
// its own ancestor (RoutePickerField.vue's parent picker excludes these) and to detect
// deletion-blocking sub-routes.
export function descendantsOf(routes, id) {
  const out = []
  function walk(parentId) {
    for (const child of childrenOf(routes, parentId)) {
      out.push(child)
      walk(child.id)
    }
  }
  walk(id)
  return out
}

// Root-to-`id` path (inclusive), for breadcrumb rendering. Returns [] if the
// route doesn't exist or its parent chain is broken (dangling parentId) —
// callers should already treat that as a validateProject warning, not crash
// here on a partial/unresolvable path.
export function pathTo(routes, id) {
  if (!id) return []
  const byId = new Map((routes || []).map((r) => [r.id, r]))
  const path = []
  let current = byId.get(id)
  const seen = new Set()
  while (current && !seen.has(current.id)) {
    path.unshift(current)
    seen.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

// Defensive check — the UI (RoutePickerField.vue's parent picker excludes self +
// descendants) shouldn't be able to author a cycle, but validateProject.js
// checks anyway: a real cycle would infinite-loop pathTo()/tree rendering.
export function hasCycle(routes) {
  const byId = new Map((routes || []).map((r) => [r.id, r]))
  for (const route of routes || []) {
    const seen = new Set()
    let current = route
    while (current?.parentId) {
      if (seen.has(current.id)) return true
      seen.add(current.id)
      current = byId.get(current.parentId)
    }
  }
  return false
}

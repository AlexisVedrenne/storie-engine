// Builds the data behind ChapterGraph.vue's node/edge visualization — pure,
// same leaf-module convention as routeTree.js/findReferences.js (no Pinia
// dependency, testable straight from Node). See docs: routes/graph are
// editor-only organization, the engine's own advance()/checkConditions
// (flat chapterOrder scan + requires) never changes.

import { childrenOf } from './routeTree.js'

// Every ChoiceEntry option tagged with `option.route` anywhere in a
// chapter's timeline — including inside nested `option.then` sub-timelines,
// same recursive shape as findReferences.js's walkTimeline. A "key choice"
// is just a choice with at least one such tagged option; a normal
// dialogue/flavor choice leaves `option.route` unset and never shows up
// here, so it has zero effect on the graph.
export function collectRouteTaggedOptions(timeline) {
  const found = []
  for (const entry of timeline || []) {
    if (entry.type !== 'choice') continue
    for (const option of entry.options || []) {
      if (option.route) found.push(option)
      found.push(...collectRouteTaggedOptions(option.then))
    }
  }
  return found
}

// First chapter (in chapterOrder) filed directly under `routeId`; if none,
// recurses into its sub-routes (alphabetical, same order RoutePickerField.vue
// shows them) until one resolves. `null` if the route (and everything
// under it) has no chapter at all — a dangling branch target, flagged by
// validateProject.js rather than crashing here.
export function firstChapterOfRoute(chapters, routes, routeId) {
  if (!routeId) return null
  const direct = (chapters || []).find((c) => c.route === routeId)
  if (direct) return direct
  const children = [...childrenOf(routes, routeId)].sort((a, b) => a.name.localeCompare(b.name))
  for (const child of children) {
    const found = firstChapterOfRoute(chapters, routes, child.id)
    if (found) return found
  }
  return null
}

// { nodes: [{id, type, position, data}], edges: [{id, source, target, type}] }
// — shape vue-flow consumes directly.
export function buildChapterGraph(chapters, routes) {
  const list = chapters || []

  // One edge per chapter: to every distinct route a key choice tags (in
  // place of the default "next in chapterOrder" edge), or to the plain
  // next chapter when there's no tagged choice AND that next chapter
  // shares the same route (including two root chapters with no route at
  // all). Two parallel branches sitting back-to-back in chapterOrder with
  // nothing tagging the transition between them is exactly how the real
  // engine expects them to be authored (each gated by its own `requires`,
  // invisible to this graph) — drawing a same-route-only default edge
  // avoids a misleading line crossing from one route's ending straight
  // into an unrelated route's next chapter just because they happen to
  // sit next to each other in the file.
  const edges = []
  list.forEach((chapter, i) => {
    const targetRouteIds = [
      ...new Set(collectRouteTaggedOptions(chapter.timeline).map((o) => o.route)),
    ]
    if (targetRouteIds.length) {
      for (const routeId of targetRouteIds) {
        const target = firstChapterOfRoute(list, routes, routeId)
        if (target && target.id !== chapter.id) {
          edges.push({ id: `${chapter.id}->${target.id}`, source: chapter.id, target: target.id })
        }
      }
    } else if (i < list.length - 1 && (list[i + 1].route || null) === (chapter.route || null)) {
      edges.push({
        id: `${chapter.id}->${list[i + 1].id}`,
        source: chapter.id,
        target: list[i + 1].id,
      })
    }
  })

  const outDegree = new Map(list.map((c) => [c.id, 0]))
  const inDegree = new Map(list.map((c) => [c.id, 0]))
  const adjacency = new Map(list.map((c) => [c.id, []]))
  for (const e of edges) {
    outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    adjacency.get(e.source)?.push(e.target)
  }

  // Column (rank) = longest path from a root (in-degree 0), via Kahn's
  // topological order. A hand-authored backward-pointing option.route could
  // in principle create a cycle (nothing here forbids it, unlike
  // RoutePickerField.vue's parent picker) — nodes a cycle prevents from ever reaching
  // in-degree 0 just fall back to their chapterOrder index as rank, so this
  // never loops forever.
  const rank = new Map()
  const remaining = new Map(inDegree)
  const queue = list.filter((c) => (inDegree.get(c.id) || 0) === 0).map((c) => c.id)
  for (const id of queue) rank.set(id, 0)
  let qi = 0
  while (qi < queue.length) {
    const id = queue[qi++]
    const r = rank.get(id) ?? 0
    for (const next of adjacency.get(id) || []) {
      rank.set(next, Math.max(rank.get(next) ?? 0, r + 1))
      remaining.set(next, (remaining.get(next) || 0) - 1)
      if (remaining.get(next) === 0) queue.push(next)
    }
  }
  list.forEach((c, i) => {
    if (!rank.has(c.id)) rank.set(c.id, i)
  })

  // Row (Y) within a rank: group same-route chapters together, otherwise
  // keep chapterOrder's relative order — no crossing-minimization beyond
  // that (would need a real layout library, out of scope for v1).
  const byRank = new Map()
  list.forEach((chapter, index) => {
    const r = rank.get(chapter.id)
    if (!byRank.has(r)) byRank.set(r, [])
    byRank.get(r).push({ chapter, index })
  })

  const RANK_GAP_X = 260
  const ROW_GAP_Y = 90

  const nodes = []
  for (const [r, items] of byRank) {
    items.sort((a, b) => {
      const ra = a.chapter.route || ''
      const rb = b.chapter.route || ''
      return ra !== rb ? ra.localeCompare(rb) : a.index - b.index
    })
    items.forEach(({ chapter, index }, row) => {
      nodes.push({
        id: chapter.id,
        type: 'chapter',
        position: { x: r * RANK_GAP_X, y: row * ROW_GAP_Y },
        data: {
          chapter,
          index,
          route: chapter.route,
          isEnding: (outDegree.get(chapter.id) || 0) === 0,
        },
      })
    })
  }

  return { nodes, edges: edges.map((e) => ({ ...e, type: 'smoothstep' })) }
}

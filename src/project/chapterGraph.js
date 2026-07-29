// Builds the data behind ChapterGraph.vue's node/edge visualization — pure,
// same leaf-module convention as findReferences.js (no Pinia dependency,
// testable straight from Node). Edges and node positions are both authored
// data now (chapter.next / chapter.position, drawn by dragging in the
// editor) — this module just shapes them for vue-flow, it never derives a
// connection from anything implicit.

import dagre from '@dagrejs/dagre'

// Matches ChapterGraphNode.vue's fixed card size — dagre needs real
// dimensions to place nodes without overlapping.
const NODE_WIDTH = 220
const NODE_HEIGHT = 64
const RANK_GAP_X = 80
const ROW_GAP_Y = 32

// Short human-readable summary of a requires object for an edge's label —
// e.g. "momTrust≥1" or "suit erwan" — empty string (no label) when the
// edge is unconditional.
export function requiresLabel(requires) {
  if (!requires) return ''
  const parts = []
  if (requires.flags) {
    for (const [key, expected] of Object.entries(requires.flags)) {
      if (typeof expected === 'boolean') {
        parts.push(expected ? key : `!${key}`)
      } else if (expected && typeof expected === 'object') {
        if ('min' in expected && 'max' in expected) parts.push(`${key} ${expected.min}-${expected.max}`)
        else if ('min' in expected) parts.push(`${key}≥${expected.min}`)
        else if ('max' in expected) parts.push(`${key}≤${expected.max}`)
      } else {
        parts.push(`${key}=${expected}`)
      }
    }
  }
  if (requires.following) {
    for (const [id, expected] of Object.entries(requires.following)) {
      parts.push(expected ? `suit ${id}` : `ne suit pas ${id}`)
    }
  }
  return parts.join(', ')
}

// Fallback layout (dagre, Sugiyama-style layered graph, rankdir LR) for
// chapters that don't have an authored `position` yet (never dragged —
// brand new project, or a chapter created before positions existed). Laid
// out on its own sub-graph (edges to/from an already-positioned chapter
// excluded) and offset below every already-positioned chapter's bounding
// box, so it never fights with or overlaps a position the author actually
// chose.
function fallbackPositions(list, edges, positioned) {
  const unpositioned = list.filter((c) => !positioned.has(c.id))
  if (!unpositioned.length) return new Map()

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: ROW_GAP_Y, ranksep: RANK_GAP_X })
  g.setDefaultEdgeLabel(() => ({}))
  for (const chapter of unpositioned) g.setNode(chapter.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) g.setEdge(edge.source, edge.target)
  }
  dagre.layout(g)

  const offsetY = positioned.size
    ? Math.max(...[...positioned.values()].map((p) => p.y)) + NODE_HEIGHT + ROW_GAP_Y
    : 0

  const out = new Map()
  for (const chapter of unpositioned) {
    const { x, y } = g.node(chapter.id)
    out.set(chapter.id, { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 + offsetY })
  }
  return out
}

// { nodes: [{id, type, position, data}], edges: [{id, source, target, type, label, data}] }
// — shape vue-flow consumes directly.
export function buildChapterGraph(chapters) {
  const list = chapters || []

  const edges = []
  for (const chapter of list) {
    ;(chapter.next || []).forEach((link, i) => {
      if (!link?.to) return
      edges.push({
        id: `${chapter.id}->${i}`,
        source: chapter.id,
        target: link.to,
        type: 'smoothstep',
        label: requiresLabel(link.requires),
        data: { requires: link.requires },
      })
    })
  }

  const positioned = new Map(
    list.filter((c) => c.position).map((c) => [c.id, c.position]),
  )
  const fallback = fallbackPositions(list, edges, positioned)

  const nodes = list.map((chapter) => ({
    id: chapter.id,
    type: 'chapter',
    position: positioned.get(chapter.id) || fallback.get(chapter.id) || { x: 0, y: 0 },
    data: {
      chapter,
      isEnding: !(chapter.next || []).length,
    },
  }))

  return { nodes, edges }
}

// Referenced-variable collector for the Apps tab's live variable inspector
// (pilier 07) — walks a SCREEN's own block tree (the same recursive shape
// every other block-tree walk in this codebase uses: `.blocks`/`.template`,
// see appHasModule.js's collectBlocksOfType) and extracts every flag/
// collection/entity-field this screen's blocks actually touch, either
// through a STRUCTURED field (a `schedule` block's own schemaId/fieldKey, a
// `ledger`'s flagKey, a `requires`/`effects` object) or through a
// free-typed `{flag:x}`/`{entity:s:e:f}` token anywhere in the block's own
// text fields.
//
// Deliberately does NOT descend into a `triggerEntry` action's own
// `then[]` — that's a list of TIMELINE entries (message/choice/effect/...),
// a structurally different shape this collector doesn't attempt to
// understand. Out of scope for a first cut; the inspector is about what a
// SCREEN's own blocks reference, not every possible consequence of tapping
// through one.
const FLAG_TOKEN = /\{flag:([\w-]+)\}/g
const ENTITY_TOKEN = /\{entity:([\w*-]+):([\w*-]+):([\w-]+)\}/g

// Keys holding nested block-shaped (or otherwise structured, already
// handled explicitly) content — walked/scanned separately, never as plain
// text.
const STRUCTURAL_KEYS = new Set([
  'blocks',
  'template',
  'steps',
  'then',
  'action',
  'requires',
  'results',
])

function addFlag(seen, out, key) {
  if (!key || seen.has(`flag:${key}`)) return
  seen.add(`flag:${key}`)
  out.push({ kind: 'flag', key })
}
function addCollection(seen, out, key) {
  if (!key || seen.has(`collection:${key}`)) return
  seen.add(`collection:${key}`)
  out.push({ kind: 'collection', key })
}
function addEntityField(seen, out, schemaId, entityId, fieldKey) {
  if (!schemaId || !fieldKey) return
  const resolvedEntityId = entityId || '*'
  const sig = `entity:${schemaId}:${resolvedEntityId}:${fieldKey}`
  if (seen.has(sig)) return
  seen.add(sig)
  out.push({ kind: 'entity', schemaId, entityId: resolvedEntityId, fieldKey })
}

function scanTokens(str, seen, out) {
  if (typeof str !== 'string') return
  let m
  FLAG_TOKEN.lastIndex = 0
  while ((m = FLAG_TOKEN.exec(str))) addFlag(seen, out, m[1])
  ENTITY_TOKEN.lastIndex = 0
  while ((m = ENTITY_TOKEN.exec(str))) addEntityField(seen, out, m[1], m[2], m[3])
}

function scanRequires(requires, seen, out) {
  if (!requires) return
  for (const f of requires.flags || []) addFlag(seen, out, f.key)
  for (const key of Object.keys(requires.collections || {})) addCollection(seen, out, key)
}

function scanEffects(effects, seen, out) {
  if (!effects) return
  for (const key of Object.keys(effects.flags || {})) addFlag(seen, out, key)
  for (const op of effects.collections || []) addCollection(seen, out, op.flagKey)
  for (const op of effects.entities || []) {
    for (const fieldKey of Object.keys(op.fields || {})) {
      addEntityField(seen, out, op.schemaId, op.entityId, fieldKey)
    }
  }
}

// Actions and lookup results share the exact same target-shaped fields a
// `form` block does (target/flagKey/schemaId/entityId/fieldKey) — see
// FormTargetFields.vue — reused here rather than re-deriving the shape.
function scanAction(action, seen, out) {
  if (!action) return
  scanRequires(action.requires, seen, out)
  scanTokens(action.onFailToast, seen, out)
  scanTokens(action.toastText, seen, out)
  if (action.type === 'effect') scanEffects(action.effects, seen, out)
  if (action.target === 'flag' && action.flagKey) addFlag(seen, out, action.flagKey)
  else if (action.target === 'entity' && action.schemaId && action.fieldKey) {
    addEntityField(seen, out, action.schemaId, action.entityId, action.fieldKey)
  }
  if (action.type === 'sequence') {
    for (const step of action.steps || []) scanAction(step, seen, out)
  }
}

function walkBlock(block, seen, out) {
  if (!block || typeof block !== 'object') return
  scanRequires(block.requires, seen, out)
  if (block.action) scanAction(block.action, seen, out)
  for (const result of block.results || []) {
    scanRequires(result.requires, seen, out)
    if (result.action) scanAction(result.action, seen, out)
    scanTokens(result.title, seen, out)
    scanTokens(result.excerpt, seen, out)
    scanTokens(result.source, seen, out)
  }

  if (block.type === 'ledger' && block.flagKey) addCollection(seen, out, block.flagKey)
  if (block.type === 'list' && block.source === 'flagCollection' && block.flagKey) {
    addCollection(seen, out, block.flagKey)
  }
  if (block.type === 'schedule' && block.schemaId && block.fieldKey) {
    addEntityField(seen, out, block.schemaId, block.entityId, block.fieldKey)
  }
  if (block.type === 'form') {
    if (block.target === 'flag' && block.flagKey) addFlag(seen, out, block.flagKey)
    else if (block.target === 'entity' && block.schemaId && block.fieldKey) {
      addEntityField(seen, out, block.schemaId, block.entityId, block.fieldKey)
    }
  }

  // Generic free-text token scan across every other own string field —
  // catches title/content/label/sublabel/toastText/placeholder/etc without
  // needing to enumerate every block type's own text field names.
  for (const [k, v] of Object.entries(block)) {
    if (STRUCTURAL_KEYS.has(k)) continue
    if (typeof v === 'string') scanTokens(v, seen, out)
  }

  for (const child of block.blocks || []) walkBlock(child, seen, out)
  for (const child of block.template || []) walkBlock(child, seen, out)
}

export function collectScreenVariables(blocks) {
  const seen = new Set()
  const out = []
  for (const block of blocks || []) walkBlock(block, seen, out)
  return out
}

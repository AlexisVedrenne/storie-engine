// Whether a custom app actually uses a given block type ANYWHERE in its
// screens (including nested card/layout containers and a list block's own
// template) — same recursion shape as collectAssetRefs/rewriteBlockSrcs in
// src-electron/ipc/customApps.js, duplicated here rather than imported from
// there since that file statically imports `electron` and can't load
// outside a real Electron process (see docs/interactions-et-apps-custom.md's
// "Piège IPC à connaître"). Used to hide app-scoped timeline/choice options
// (e.g. `conversations`) for apps that don't actually place that module —
// picking one used to list every custom app regardless.
function blocksContainType(blocks, type) {
  for (const block of blocks || []) {
    if (block.type === type) return true
    if (Array.isArray(block.blocks) && blocksContainType(block.blocks, type)) return true
    if (Array.isArray(block.template) && blocksContainType(block.template, type)) return true
  }
  return false
}

export function appHasBlockType(app, type) {
  return (app?.screens || []).some((screen) => blocksContainType(screen.blocks, type))
}

// Which screen of an app holds the first block of the given type — used to
// land the phone directly on that screen (e.g. a `timeskip` entry's
// landThread needs the screen containing the `conversations` block, not
// just the app's own default first screen). Null if the app doesn't use
// that block type at all (see appHasBlockType).
export function findScreenWithBlockType(app, type) {
  for (const screen of app?.screens || []) {
    if (blocksContainType(screen.blocks, type)) return screen.id
  }
  return null
}

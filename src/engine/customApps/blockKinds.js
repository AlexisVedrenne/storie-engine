// Fixed catalog of visual blocks an author composes a custom app's screen
// from (see BlockBuilder.vue for authoring, BlockList.vue for the runtime
// interpreter that reads the same `type` values) — same "small bounded
// vocabulary, not a free canvas" precedent as stepKinds.js for interactions.
// `icon` here is only the palette's own Material icon (authoring UI), not a
// per-block field.
export const BLOCK_KINDS = [
  { type: 'header', icon: 'view_headline' },
  { type: 'text', icon: 'notes' },
  { type: 'image', icon: 'image' },
  { type: 'avatar', icon: 'account_circle' },
  { type: 'row', icon: 'list' },
  { type: 'card', icon: 'crop_square' },
  { type: 'layout', icon: 'view_column' },
  { type: 'badge', icon: 'label' },
  { type: 'divider', icon: 'horizontal_rule' },
  { type: 'button', icon: 'smart_button' },
  { type: 'tabs', icon: 'tab' },
  { type: 'list', icon: 'repeat' },
  { type: 'conversations', icon: 'forum' },
]

export function paletteIcon(type) {
  return BLOCK_KINDS.find((k) => k.type === type)?.icon || 'help_outline'
}

export function defaultBlock(type) {
  switch (type) {
    case 'header':
      return { type, title: '', icon: 'apps', color: '#4c8bf5' }
    case 'text':
      return { type, style: 'body', content: '' }
    case 'image':
      return { type, src: '', fullBleed: false }
    case 'avatar':
      return { type, label: '', color: '#607d8b', icon: '', src: '' }
    case 'row':
      return { type, icon: '', label: '', sublabel: '', chevron: false }
    case 'card':
      return { type, blocks: [] }
    case 'layout':
      // Pure flex arranger — no background/padding chrome of its own,
      // unlike `card` (which is really "layout, column direction, + a
      // visible grouped-card background"). `direction` picks row vs column;
      // `gap` in px between children.
      return { type, direction: 'row', gap: 8, blocks: [] }
    case 'badge':
      return { type, label: '', color: '#4c8bf5' }
    case 'divider':
      return { type }
    case 'button':
      // `action.type`: 'none' (default, purely visual) | 'effect' (applies
      // flags/effects, same shape/mechanism as a choice option's own
      // `effects`) | 'navigateScreen' (switches this app's active screen,
      // same mechanism as the `tabs` block). Small fixed catalog, not a
      // generic action system — see ButtonBlock.vue.
      return { type, label: '', color: '#4c8bf5', action: { type: 'none' } }
    case 'tabs':
      return { type, tabs: [{ label: '', screenId: '' }] }
    case 'list':
      // v1 has exactly one source (project contacts) — no `source` picker
      // yet, matching "small bounded vocabulary" until a second source is
      // actually needed. `template` is a block subtree (same shape as
      // card/layout's own `blocks[]`) authored ONCE and repeated per
      // contact; its text fields can use the `{item:...}` tokens (see
      // resolveDynamicText.js) to read the current contact.
      return { type, onlyFollowed: false, template: [] }
    case 'conversations':
      // The "conversation module" — real interactive chat, not just visual
      // (see docs — this is the first custom-app block that reads/writes
      // game state on its own). Thread DEFINITIONS (id/name/participants
      // for a group; a 1:1 needs none, it's just a project contact id) are
      // the project's own native `project.threads` (the Threads editor tab)
      // — reused as-is, not re-authored per block. Only the actual MESSAGE
      // HISTORY is namespaced per app (story.appThreads), so a custom app's
      // conversation never crosses into native DM/SMS or another app's own
      // chat, while "who's in the group" stays single-sourced. `showAvatar`/
      // `nameField` are the two display options asked for — which contact
      // info to render, not per-message content.
      return { type, showAvatar: true, nameField: 'name' }
    default:
      return { type }
  }
}

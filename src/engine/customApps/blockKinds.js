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
      return { type, label: '', color: '#4c8bf5' }
    case 'tabs':
      return { type, tabs: [{ label: '', screenId: '' }] }
    default:
      return { type }
  }
}

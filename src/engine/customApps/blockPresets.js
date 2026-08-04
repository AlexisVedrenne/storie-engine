// Compound presets — small pre-assembled block trees for patterns an author
// would otherwise build by hand every time (a profile header, a settings
// list...). Each `build()` returns ONE root block (usually a `layout` or
// `card` with children already set up) inserted as a single item — still
// just data made of the same fixed block vocabulary (see blockKinds.js),
// nothing new for the runtime interpreter to understand.
export const BLOCK_PRESETS = [
  {
    id: 'profile-header',
    icon: 'badge',
    build: () => ({
      type: 'layout',
      direction: 'row',
      gap: 12,
      blocks: [
        { type: 'avatar', label: '', color: '#607d8b' },
        { type: 'text', style: 'title', content: '' },
      ],
    }),
  },
  {
    id: 'stat-row',
    icon: 'bar_chart',
    build: () => ({
      type: 'layout',
      direction: 'row',
      gap: 8,
      blocks: [
        { type: 'badge', label: '', color: '#4c8bf5' },
        { type: 'badge', label: '', color: '#4caf50' },
      ],
    }),
  },
  {
    id: 'settings-section',
    icon: 'list_alt',
    build: () => ({
      type: 'card',
      blocks: [
        { type: 'row', icon: '', label: '', sublabel: '', chevron: true },
        { type: 'divider' },
        { type: 'row', icon: '', label: '', sublabel: '', chevron: true },
      ],
    }),
  },
  {
    id: 'call-to-action',
    icon: 'campaign',
    build: () => ({
      type: 'layout',
      direction: 'column',
      gap: 8,
      blocks: [
        { type: 'text', style: 'title', content: '' },
        { type: 'text', style: 'body', content: '' },
        { type: 'button', label: '', color: '#4c8bf5' },
      ],
    }),
  },
]

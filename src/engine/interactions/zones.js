// Generic 3x3 on-screen zone vocabulary shared by the editor's ZonePicker.vue
// (author picks WHERE a step's gesture happens) and the runtime
// InteractionPlayer.vue (positions a step's dressing + hit-tests pointer
// events against the chosen zone) — same "one shared catalog, editor and
// runtime both read it" precedent as triggers.js.
export const ZONES = [
  'anywhere',
  'topLeft',
  'top',
  'topRight',
  'left',
  'center',
  'right',
  'bottomLeft',
  'bottom',
  'bottomRight',
]

const POSITION = {
  topLeft: { top: '22%', left: '20%' },
  top: { top: '22%', left: '50%' },
  topRight: { top: '22%', left: '80%' },
  left: { top: '50%', left: '20%' },
  center: { top: '50%', left: '50%' },
  right: { top: '50%', left: '80%' },
  bottomLeft: { top: '78%', left: '20%' },
  bottom: { top: '78%', left: '50%' },
  bottomRight: { top: '78%', left: '80%' },
}

// CSS position (percent top/left) for a zone — 'anywhere' and any unknown
// value fall back to dead center.
export function zoneStyle(zone) {
  return POSITION[zone] || POSITION.center
}

const GRID = [
  ['topLeft', 'top', 'topRight'],
  ['left', 'center', 'right'],
  ['bottomLeft', 'bottom', 'bottomRight'],
]

// Whether a pointer at normalized (0..1) coordinates falls inside the given
// zone's third of the screen. 'anywhere' always hits.
export function zoneContains(zone, xFrac, yFrac) {
  if (!zone || zone === 'anywhere') return true
  const col = xFrac < 1 / 3 ? 0 : xFrac < 2 / 3 ? 1 : 2
  const row = yFrac < 1 / 3 ? 0 : yFrac < 2 / 3 ? 1 : 2
  return GRID[row][col] === zone
}

// Fixed vocabulary of generic gesture primitives an author composes an
// `interaction` definition's `steps[]` from (see game.interactions in
// story.js / docs) — the whole point of this catalog is that it's a small,
// bounded set of building blocks (not arbitrary code) that InteractionStepsEditor.vue
// (authoring) and InteractionPlayer.vue (runtime) both interpret the same
// way. `fields` is authoring metadata only — which of a step's extra fields
// StepsEditor should render for that kind; the runtime player switches on
// `kind` directly, it doesn't consult this list.
//
// Every step, regardless of kind, also carries `text` (narrative caption)
// and `icon` (optional Material icon) for its on-screen dressing, plus an
// optional `timeLimitMs` (required in spirit for `wait`, which uses its own
// `durationMs` as that deadline). Uniform rule: input outside the target is
// just ignored, never an instant fail — only a step's own time limit
// expiring fails the whole interaction (see story.js's finishInteraction).
export const STEP_KINDS = [
  { kind: 'tap', fields: ['zone'] },
  { kind: 'hold', fields: ['zone', 'durationMs'] },
  { kind: 'swipe', fields: ['direction'] },
  { kind: 'drag', fields: ['from', 'to'] },
  { kind: 'wipe', fields: ['zone', 'durationMs'] },
  { kind: 'code', fields: ['digits'] },
  { kind: 'wait', fields: ['durationMs'] },
]

export const STEP_KIND_IDS = STEP_KINDS.map((k) => k.kind)

export function fieldsForKind(kind) {
  return STEP_KINDS.find((k) => k.kind === kind)?.fields || []
}

export const SWIPE_DIRECTIONS = ['up', 'down', 'left', 'right']

export function defaultStep(kind) {
  const base = { kind, text: '' }
  switch (kind) {
    case 'tap':
      return { ...base, zone: 'anywhere' }
    case 'hold':
      return { ...base, zone: 'anywhere', durationMs: 1200 }
    case 'swipe':
      return { ...base, direction: 'up' }
    case 'drag':
      return { ...base, from: 'bottom', to: 'center' }
    case 'wipe':
      return { ...base, zone: 'center', durationMs: 1500 }
    case 'code':
      return { ...base, digits: '1234' }
    case 'wait':
      return { ...base, durationMs: 1500 }
    default:
      return base
  }
}

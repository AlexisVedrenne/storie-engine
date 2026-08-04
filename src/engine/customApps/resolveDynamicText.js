// Variable interpolation for custom-app block text — deliberately NOT
// story.js's own `fill()` (used for `{name}` in chapter/narrative text),
// which also resolves i18n translation against the CURRENT CHAPTER bucket —
// a custom app screen isn't tied to any chapter, so that lookup wouldn't
// make sense here. This is a separate, smaller mechanism: plain string
// substitution, nothing else.
//
// Two token shapes:
//   - `{flag:<key>}` — reads story.flags[key] directly. Flags are already
//     the project's one general-purpose "variable" (readable/writable from
//     everywhere: requires/effects on chapters, events, interactions, now
//     block display conditions too) — reusing them here instead of
//     inventing a parallel "app variable" concept. Always a number (a
//     boolean flag is stored as 1/0 by applyEffects(), see story.js) — no
//     separate boolean formatting needed.
//   - A small FIXED set of already-existing "live" story fields, the same
//     ones the phone's own home-screen widgets already display — reusing
//     proven data, not introducing anything new.
export const FIXED_TOKENS = [
  { id: 'playerName', token: '{playerName}' },
  { id: 'battery', token: '{battery}' },
  { id: 'steps', token: '{steps}' },
  { id: 'stepsGoal', token: '{stepsGoal}' },
  { id: 'weather', token: '{weather}' },
]

function resolveFixedToken(id, story) {
  switch (id) {
    case 'playerName':
      return story.playerName || ''
    case 'battery':
      return String(story.battery ?? '')
    case 'steps':
      return String(story.steps ?? '')
    case 'stepsGoal':
      return String(story.stepsGoal ?? '')
    case 'weather':
      return story.weather?.temp != null ? `${story.weather.temp}°` : ''
    default:
      return ''
  }
}

export function resolveDynamicText(text, story) {
  if (!text) return text
  let out = text.replace(/\{flag:([a-zA-Z0-9_]+)\}/g, (_, key) => String(story.flags?.[key] ?? 0))
  for (const { id, token } of FIXED_TOKENS) {
    if (out.includes(token)) out = out.split(token).join(resolveFixedToken(id, story))
  }
  return out
}

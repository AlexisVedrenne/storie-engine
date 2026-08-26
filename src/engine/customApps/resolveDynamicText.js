// Variable interpolation (+ translation) for custom-app block text —
// deliberately NOT story.js's own `fill()` (used for `{name}` in chapter/
// narrative text), which resolves i18n against the CURRENT CHAPTER bucket —
// a custom app screen isn't tied to any chapter, so that lookup wouldn't
// make sense here. Translation instead goes through the SAME 'common'
// bucket contact names/bios/group thread names already use (via
// story.translateStory(text, 'common')) — same reasoning: none of it is
// chapter-scoped. See extractTranslatableStrings.js's addBlockStrings for
// what actually gets surfaced in the i18n editor's "Commun" tab.
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

// Only meaningful inside a `list` block's per-item template (see
// ListBlock.vue/ListItemScope.vue) — the shape of `item` depends on the
// block's own `source` (see blockKinds.js), so there are two separate
// token sets; VariablePickerBtn shows whichever one matches (see its
// `itemScope` prop, now `'contacts'|'flagCollection'` instead of a plain
// bool). No `{item:avatar}` text token for contacts — the avatar BLOCK
// picks up the current contact's photo via its own "use contact's avatar"
// toggle instead (see AvatarBlock.vue/BlockPropertiesForm.vue), since
// AssetField (the avatar image widget) has no free-text entry to type a
// token into.
export const CONTACT_ITEM_TOKENS = [
  { id: 'itemName', token: '{item:name}' },
  { id: 'itemHandle', token: '{item:handle}' },
  { id: 'itemPseudo', token: '{item:pseudo}' },
  { id: 'itemFollowers', token: '{item:followers}' },
  { id: 'itemFollowing', token: '{item:following}' },
  { id: 'itemColor', token: '{item:color}' },
]

// `source: 'flagCollection'` items are plain `{key, value}` pairs (see
// story.js's collectionItems getter) — no contact fields at all.
export const COLLECTION_ITEM_TOKENS = [
  { id: 'itemKey', token: '{item:key}' },
  { id: 'itemValue', token: '{item:value}' },
]

// `source: 'entity'` items are `{ id, ...fields }` (story.entityItems), one
// field per the AUTHOR'S OWN schema (see the Schémas tab) — unlike the two
// fixed token sets above, there's no closed list to declare here. Builds one
// token per schema field instead; VariablePickerBtn calls this directly
// (given the schema def, looked up from `game.entitySchemas` by id) rather
// than importing a static export.
export function entityItemTokens(schema) {
  return (schema?.fields || []).map((f) => ({
    id: `itemField:${f.key}`,
    token: `{item:${f.key}}`,
    label: f.label || f.key,
  }))
}

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

// `handle` reuses story.socialHandle()'s own `@pseudo` (falls back to plain
// name if the contact has no pseudo) — the exact same formatting already
// shown on every social screen (Fil/profils/DMs), not a new convention.
// `followers`/`following` reuse story.socialStats() — base contact value +
// whatever a chapter's effects have added, same number shown on a profile.
function resolveItemToken(field, item, story) {
  switch (field) {
    case 'name':
      return item?.name ?? ''
    case 'handle':
      return item ? story.socialHandle(item) : ''
    case 'pseudo':
      return item?.pseudo ?? ''
    case 'followers':
      return item ? String(story.socialStats(item.id).followers) : ''
    case 'following':
      return item ? String(story.socialStats(item.id).following) : ''
    case 'color':
      return item?.color ?? ''
    // `source: 'flagCollection'` items — see COLLECTION_ITEM_TOKENS above.
    case 'key':
      return item?.key ?? ''
    case 'value':
      return item?.value ?? ''
    // `source: 'entity'` items — any other field name is looked up straight
    // off the item (story.entityItems returns `{ id, ...fields }`), since
    // the field catalog is author-defined per schema, not a fixed set this
    // file can enumerate. Silently '' for a field that doesn't exist on the
    // current item, same "absent = blank" spirit as every other token here.
    default:
      return item?.[field] ?? ''
  }
}

// `item` is the current contact when resolving inside a list's per-item
// template (see ListItemScope.vue's provide/TextBlock.vue etc's inject) —
// undefined everywhere else, in which case `{item:...}` tokens resolve to
// '' rather than throwing (same "silently absent" spirit as a block failing
// its display condition).
export function resolveDynamicText(text, story, item) {
  if (!text) return text
  // Translated FIRST (dictionary keyed by the exact French source, tokens
  // included verbatim), tokens substituted into the result after — same
  // order as story.js's own fill() (translateStory, then {name}).
  let out = story.translateStory(text, 'common')
  out = out.replace(/\{flag:([a-zA-Z0-9_]+)\}/g, (_, key) => String(story.flags?.[key] ?? 0))
  // Field name is an open set for `source: 'entity'` (author-defined schema
  // fields, see entityItemTokens above) — unlike the fixed alternation this
  // used to be, any `[a-zA-Z0-9_]+` is accepted and resolveItemToken's
  // `default` case falls back to reading it straight off `item`.
  out = out.replace(/\{item:([a-zA-Z0-9_]+)\}/g, (_, field) =>
    String(resolveItemToken(field, item, story)),
  )
  for (const { id, token } of FIXED_TOKENS) {
    if (out.includes(token)) out = out.split(token).join(resolveFixedToken(id, story))
  }
  return out
}

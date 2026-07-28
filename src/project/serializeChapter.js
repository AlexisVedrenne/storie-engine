// Turns an in-memory chapter object (the editable model living at
// story.project.chapters[i]) back into JS module source text. Only needs to
// produce syntactically valid JS — formatting/style is entirely Prettier's
// job, applied by the main process right before writing to disk (see
// src-electron/ipc/project.js's `project:saveChapter` handler).
//
// Chapters are pure data (decision #1, docs/editor-plan-phase1.md) — no
// functions, no imports needed inside. `undefined` is used by the editor
// forms as the "this optional field isn't set" sentinel and is dropped
// entirely from the output (matching how hand-written chapters simply omit
// an absent optional key, rather than writing it out as `null`).

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function quoteKey(key) {
  return IDENTIFIER_RE.test(key) ? key : JSON.stringify(key)
}

export function toJsLiteral(value) {
  if (value === undefined) return 'undefined' // only ever hit at the top level; object/array cases filter these out
  if (value === null) return 'null'

  const type = typeof value
  if (type === 'string') return JSON.stringify(value)
  if (type === 'number' || type === 'boolean') return String(value)

  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return `[${value.map((v) => toJsLiteral(v)).join(', ')}]`
  }

  if (type === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    if (!entries.length) return '{}'
    const body = entries.map(([k, v]) => `${quoteKey(k)}: ${toJsLiteral(v)}`).join(', ')
    return `{ ${body} }`
  }

  throw new Error(`serializeChapter: cannot serialize value of type ${type}`)
}

// Strips the editor-only `__sourceFile` bookkeeping field (see
// src-electron/ipc/project.js's scanChapters) — it's how the app tracks
// which file a chapter came from, never part of the authored content.
export function serializeChapter(chapter) {
  // eslint-disable-next-line no-unused-vars
  const { __sourceFile, ...content } = chapter
  return `export default ${toJsLiteral(content)};\n`
}

// contacts.js / threads.js / game.js are flat data (array / array / object)
// with no editor-only bookkeeping field to strip — thin named wrappers over
// toJsLiteral so call sites read as intent, matching serializeChapter().
export function serializeContacts(contacts) {
  return `export default ${toJsLiteral(contacts)};\n`
}

export function serializeThreads(threads) {
  return `export default ${toJsLiteral(threads)};\n`
}

export function serializeRoutes(routes) {
  return `export default ${toJsLiteral(routes)};\n`
}

export function serializeGame(game) {
  return `export default ${toJsLiteral(game)};\n`
}

// i18n/<locale>/<bucket>.js — flat {frenchText: translatedText} dict.
export function serializeI18nBucket(dict) {
  return `export default ${toJsLiteral(dict)};\n`
}

// seed/<bucket>.js — either a dict (messages/dms, keyed by contact/thread
// id) or a flat array (posts/reels/photos); toJsLiteral handles both shapes
// already, this is just the intent-revealing wrapper matching the others.
export function serializeSeedBucket(data) {
  return `export default ${toJsLiteral(data)};\n`
}

// The Stories Engine EDITOR's own UI language — deliberately independent
// from `story.locale`/the shared vue-i18n instance in
// src/engine/i18n/instance.js (that one drives the phone-chrome text AND
// which project.i18n bucket the preview reads, i.e. "what language is
// this STORY being tested in" — switching it while authoring must not
// also flip the editor's own labels/tooltips, and vice versa). Two
// unrelated settings, two independent localStorage keys.
//
// Lives under src/editor/ on purpose — never copied into a built game
// (see src-electron/ipc/build.js's copy list / [[stories-engine-build-boundary]]
// memory), unlike src/i18n/ which ships in every export.
//
// A tiny custom lookup instead of a second vue-i18n instance: vue-i18n's
// "local scope" composer is meant for exactly this kind of independent
// island, but its inheritance across a component tree only works if every
// single descendant re-declares `useI18n({ useScope: 'local' })` in the
// right order — one missed component silently falls back to the GLOBAL
// (story) locale instead of erroring, which would be a nasty, easy-to-miss
// bug across 30+ files. A flat reactive lookup has no such failure mode.
import { computed, ref } from 'vue'
import enUS from './en-US.js'
import frFR from './fr-FR.js'
import esES from './es-ES.js'
import deDE from './de-DE.js'
import itIT from './it-IT.js'

const MESSAGES = { 'fr-FR': frFR, 'en-US': enUS, 'es-ES': esES, 'de-DE': deDE, 'it-IT': itIT }
const LOCALE_KEY = 'stories-engine-editor-locale'

function readStored() {
  try {
    return localStorage.getItem(LOCALE_KEY) || ''
  } catch {
    return ''
  }
}

const editorLocale = ref(readStored() || 'fr-FR')

export function setEditorLocale(code) {
  if (!MESSAGES[code]) return
  editorLocale.value = code
  try {
    localStorage.setItem(LOCALE_KEY, code)
  } catch {
    // storage unavailable (private mode, etc.) — doesn't persist across
    // reloads, still works for the rest of this session.
  }
}

// Reads a dot-path ('dialog.confirmDelete.title') out of the current
// locale's dictionary, falling back to fr-FR (the always-complete source
// language) if a key is missing in the target locale, then to the raw key
// itself if it's missing everywhere (so a forgotten translation shows up
// as a visibly-wrong string during development instead of a blank).
// `params` does simple `{name}` interpolation, same token syntax as
// vue-i18n's own messages elsewhere in this codebase, for familiarity.
function lookupPath(dict, keys) {
  return keys.reduce(
    (node, key) => (node && typeof node === 'object' ? node[key] : undefined),
    dict,
  )
}
function lookup(dict, path) {
  return lookupPath(dict, path.split('.'))
}

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match))
}

export function editorT(key, params) {
  const raw = lookup(MESSAGES[editorLocale.value], key) ?? lookup(MESSAGES['fr-FR'], key) ?? key
  return interpolate(raw, params)
}

// Same lookup as editorT, but returns `null` (not the raw key string) when
// truly missing in both locales — for overriding text that's authored
// SOMEWHERE ELSE with its own real fallback value (trigger/entry-type
// labels defined in src/engine/events/triggers.js or a plug-in app's
// entryType.js, both shared with the shipped game — see
// src/editor/i18n/sharedOverrides.js). Those call sites need "translated
// if we have it, otherwise the original authored text", never a visibly
// broken 'triggers.foo.label' string.
export function editorTOptional(key, params) {
  const raw = lookup(MESSAGES[editorLocale.value], key) ?? lookup(MESSAGES['fr-FR'], key)
  return raw === undefined ? null : interpolate(raw, params)
}

// Same as editorTOptional, but takes the path as an ARRAY of exact keys
// instead of a dot-joined string — needed wherever a key segment can
// itself contain a literal dot (trigger names like 'photo.viewed' or
// 'app.closed' — see sharedOverrides.js). A dot-joined string has no way
// to tell "one segment with a dot in it" from "two nested segments", which
// silently broke every trigger override (always fell through to null)
// before this existed.
export function editorTOptionalPath(keys, params) {
  const raw = lookupPath(MESSAGES[editorLocale.value], keys) ?? lookupPath(MESSAGES['fr-FR'], keys)
  return raw === undefined ? null : interpolate(raw, params)
}

export function useEditorI18n() {
  return {
    t: editorT,
    locale: computed(() => editorLocale.value),
    setLocale: setEditorLocale,
  }
}

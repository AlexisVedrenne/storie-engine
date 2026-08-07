import { createI18n } from 'vue-i18n'
import messages from '@/i18n'
import { DEFAULT_LOCALE } from '@/engine/i18n/locales'

// Read synchronously so the very first paint (including the boot screen,
// before Pinia has hydrated anything) is already in the right language — a
// dedicated tiny key, independent of the story project's own persistence
// (phase 1 has none — see src/engine/stores/story.js).
const LOCALE_KEY = 'stories-engine-locale'

export function readStoredLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) || ''
  } catch {
    return ''
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale() || DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  globalInjection: true,
  messages,
})

// Quasar's own lang pack (native component labels like OK/Cancel) — lazy
// per-file glob (Vite/Quasar's documented recipe for runtime lang
// switching) so we don't bundle every pack for every locale up front.
const quasarLangFiles = import.meta.glob('../../../node_modules/quasar/lang/*.js')

async function applyQuasarLang(code) {
  // Quasar's pack filenames are the language only ('fr.js') for some
  // locales and the full tag for others ('en-US.js') — try the exact code
  // first, fall back to the language subtag.
  const candidates = [code, code.split('-')[0]]
  for (const name of candidates) {
    const loader = quasarLangFiles[`../../../node_modules/quasar/lang/${name}.js`]
    if (!loader) continue
    try {
      const { Quasar } = await import('quasar')
      const lang = await loader()
      Quasar.lang.set(lang.default)
    } catch {
      // Quasar not mounted yet, or pack failed to load — non-fatal, the
      // app keeps whatever lang pack it already had.
    }
    return
  }
}

// Called by story.setLocale() so the UI (vue-i18n) and the narrative content
// (story.translateStory, driven by story.locale) always switch together.
export function persistLocale(code) {
  try {
    localStorage.setItem(LOCALE_KEY, code)
  } catch {
    // storage unavailable (private mode, etc.) — the app still works, it
    // just won't remember the choice on the very next boot.
  }
  i18n.global.locale.value = code
  applyQuasarLang(code)
}

// apply the Quasar lang pack matching the locale resolved above — later,
// explicit changes go through persistLocale() instead, this is just for
// the very first boot.
applyQuasarLang(i18n.global.locale.value)

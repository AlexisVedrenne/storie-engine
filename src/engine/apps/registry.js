// Auto-discovers every phone app instead of hand-maintaining a list —
// ANY folder at src/components/apps/<id>/ with a manifest.js (default-
// exporting {id, order, labelKey, icon, color, badge(story)}) and an
// App.vue shows up here automatically, no other file needs editing. This
// is what makes the engine genuinely extensible for an open-source
// contributor: add a properly-shaped folder, get a working app — not just
// toggleable, actually pluggable at the source level.
//
// Root-absolute glob patterns (the leading `/`) resolve against whichever
// project Vite is currently building, not against this file's own location
// — so this still works unmodified inside the temp shell src-electron/ipc/
// build.js assembles for an exported game (it copies src/components/apps
// and src/engine wholesale, then runs its own `quasar build` on that copy).
// A contributed app added to the editor's own source is therefore shipped
// in every exported game from that point on (until toggled off per-project
// via game.disabledApps, see GameForm.vue's "Applications" panel).
//
// Every consumer (PhoneShell.vue, HomeScreen.vue, SetupWizard.vue,
// GameForm.vue) reads APP_REGISTRY — none of them hardcode the app list
// anymore.
const manifestModules = import.meta.glob('/src/components/apps/*/manifest.js', { eager: true })
const componentModules = import.meta.glob('/src/components/apps/*/App.vue', { eager: true })

const MANIFEST_SUFFIX = '/manifest.js'
const APPS_ROOT = '/src/components/apps/'

function appDirFromManifestPath(path) {
  return path.slice(APPS_ROOT.length, path.length - MANIFEST_SUFFIX.length)
}

export const APP_REGISTRY = Object.entries(manifestModules)
  .map(([path, mod]) => {
    const dir = appDirFromManifestPath(path)
    const component = componentModules[`${APPS_ROOT}${dir}/App.vue`]?.default
    if (!component) {
      // A manifest with no matching App.vue is a broken/half-written app
      // module — skip it rather than register something with nothing to
      // render (PhoneShell.vue would just show a blank screen for it).
      console.warn(`[storie-engine] app "${dir}" has a manifest.js but no App.vue — skipped`)
      return null
    }
    return { ...mod.default, component }
  })
  .filter(Boolean)
  // `order` is optional — an app that doesn't set one sorts after every one
  // that does, in whatever order import.meta.glob happened to enumerate
  // them (stable sort keeps that enumeration order among ties).
  .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

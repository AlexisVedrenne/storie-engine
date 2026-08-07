// Generated game shell — see stories-engine/docs/phase3-plan.md.
// Deliberately trimmed vs stories-engine's own quasar.config.js: no editor
// UI, no vite-plugin-checker/eslint (this project is never hand-edited),
// no Dialog/Notify plugins (the game itself never shows editor dialogs).
import { defineConfig } from '#q-app'

export default defineConfig((ctx) => {
  return {
    boot: ['i18n'],

    css: ['app.scss'],

    extras: ['roboto-font', 'material-icons'],

    build: {
      target: {},
      vueRouterMode: 'hash',

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            ssr: ctx.mode.ssr || ctx.mode.ssg,
            include: [ctx.appPaths.resolve.app('src/i18n')],
          },
        ],
      ],
    },

    framework: {
      // PhoneShell's design is dark-only.
      config: { dark: true },
      plugins: [],
    },

    animations: [],

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {
        // STORIE_ELECTRON_CACHE (set by build.js when it spawns this build,
        // see shellAssembly.js's VENDORED_ELECTRON_CACHE) points at a
        // pre-downloaded copy of the exact Electron zip this step needs —
        // without it, @electron/packager falls back to its own default
        // cache (%LOCALAPPDATA%/electron/Cache), empty on a machine that's
        // never run an Electron dev tool before, meaning a genuine end
        // user's first "Build" would need a ~130MB network download it was
        // never supposed to need. Undefined (falls back to that default)
        // when this template is built directly from source without going
        // through build.js/webPreview.js — e.g. a maintainer poking at
        // templates/game-shell on its own.
        download: process.env.STORIE_ELECTRON_CACHE
          ? { cacheRoot: process.env.STORIE_ELECTRON_CACHE }
          : undefined,
      },
      builder: {
        appId: 'storie-game',
      },
    },
  }
})

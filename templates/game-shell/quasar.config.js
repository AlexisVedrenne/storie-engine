// Generated game shell — see storie-engine/docs/phase3-plan.md.
// Deliberately trimmed vs storie-engine's own quasar.config.js: no editor
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
            include: [ctx.appPaths.resolve.app('src/i18n')]
          }
        ]
      ]
    },

    framework: {
      // PhoneShell's design is dark-only.
      config: { dark: true },
      plugins: []
    },

    animations: [],

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'storie-game'
      }
    }
  }
})

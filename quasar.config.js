// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from '#q-app'

export default defineConfig((ctx) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['i18n'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['design-tokens.scss', 'app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v7',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      // Electron builds always output to the same dist/electron folder,
      // which gets wiped at the start of every `quasar build`. Chaining
      // per-platform builds (see npm scripts build:electron:*) would
      // otherwise have each one erase the previous target's output —
      // split by -T target so win/linux/mac survive side by side.
      ...(ctx.mode.electron && ctx.targetName && ctx.targetName !== 'all'
        ? { distDir: `dist/electron-${ctx.targetName}` }
        : {}),

      target: {
        // browser: 'baseline-widely-available',
        // node: 'node22'
      },

      // https://v2.quasar.dev/quasar-cli-vite/page-routing-with-vue-router#filename-based-routing
      // filenameBasedRouting: true,

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,

      // publicPath: '/',
      // define: {},
      // defineEnv: {}
      // ignorePublicFolder: true,
      // minify: false,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.mode.ssr || ctx.mode.ssg,

            // you need to set i18n resource including paths !
            include: [ctx.appPaths.resolve.app('src/i18n')],
          },
        ],
        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true, // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      // App is dark-only (see docs/ui-ux-guidelines.md) — without this,
      // Quasar's own components (q-input, q-select, q-dialog, q-btn-toggle,
      // q-expansion-item...) render in light mode by default regardless of
      // our custom dark CSS, which was a major source of visual inconsistency.
      config: { dark: true },

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Dialog', 'Notify'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-sw',
    //   pwaServiceWorker: 'src-pwa/sw/custom-sw',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      /**
       * The default port that the production server should use
       * (gets superseded if process.env.PORT is specified at runtime)
       */
      prodPort: 3000,
      middlewares: [
        'render', // keep this as last one
      ],

      // clientSideRenderingRoutes: [],
      // noPreloadTagRoutes: [],
      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,
      // prodScriptNamedExport: false,

      // extendSSRPackageJson (pkgJson) {},
      // extendSSRManifestJson (json) {},
      // extendSSRWebserverConf (rolldownConf) {},

      // pwa: true,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // extendSSRGenerateSWOptions (cfg) {},
      // extendSSRInjectManifestOptions (cfg) {},
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssg/configuring-ssg
    ssg: {
      // onSsgRendererError: 'abort',
      // ssgRendererConcurrency: 1,
      // ssgRendererRetryCount: 0,
      // ssgRendererRetryDelay: 1000,
      // ssgRendererDirectoryIndexes: true,
      // error404HtmlFilename: '404.html',
      // clientSideRenderingHtmlFilename: 'csr.html',
      // clientSideRenderingRoutes: [],
      // noPreloadTagRoutes: []
      // extendSSGRendererConf (rolldownConf) {},
      // extendSSGManifestJson (json) {},
      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,
      // pwa: true,
      // pwaOfflineHtmlFilename: 'offline.html',
      // extendSSGGenerateSWOptions (cfg) {},
      // extendSSGInjectManifestOptions (cfg) {},
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendPWAManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPWAMetaTags: false,
      // extendPWACustomSWConf (rolldownConf) {},
      // extendPWAGenerateSWOptions (cfg) {},
      // extendPWAInjectManifestOptions (cfg) {},
      // extendPWASwTsConfig (tsConfig) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {},

    // https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (rolldownConf) {},
      // extendElectronPreloadConf (rolldownConf) {},
      // extendElectronPackageJson (pkgJson) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ['electron-preload'],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }

        // Packaged app icon (Explorer/.exe on Windows, Finder/.app on macOS).
        // No extension: packager resolves .ico/.icns/.png per target platform.
        // Distinct from src-electron/electron-main.js's BrowserWindow `icon`,
        // which only sets the runtime window/taskbar icon, not this one.
        icon: path.join(
          import.meta.dirname,
          'src-electron/electron-assets/icons/icon'
        ),

        // src-electron/ipc/build.js (the "export this project as a
        // playable game" pipeline) reads templates/game-shell/ + this
        // editor's own src/engine, src/components/{phone,apps}, src/boot,
        // src/i18n, src/css, src/utils at runtime, rooted at APP_ROOT
        // (process.cwd() in dev, process.resourcesPath once packaged — see
        // that file). None of that is otherwise bundled by
        // @quasar/app-vite's own build (it only compiles what's actually
        // imported into the editor's SPA output), so it has to be copied in
        // as raw extra resources or a packaged stories-engine.exe can build
        // projects at all (was a known, documented gap — docs/phase3-plan.md
        // — until the editor itself started getting packaged). Whole `src`
        // rather than just the needed subfolders, on purpose: build.js's own
        // comment is explicit that the engine copy must never be a
        // hand-maintained duplicate, always "fresh from the editor's own
        // current source" — carving out a separate pre-staged subset would
        // reintroduce exactly that drift risk for a few hundred KB of
        // editor-only source it doesn't hurt to also carry. `public` too —
        // assembleShell() also copies APP_ROOT/public/{icons,sounds} and
        // favicon.ico into the exported game (engine sound effects live in
        // public/sounds/, see src/engine/utils/sound.js) — missing from
        // this list originally, which made a packaged stories-engine.exe
        // silently ship every exported game with zero sound files
        // (copyIfExists() no-ops when the source doesn't exist, no error).
        extraResource: [
          path.join(import.meta.dirname, 'src'),
          path.join(import.meta.dirname, 'templates'),
          path.join(import.meta.dirname, 'public'),
        ],

        // extraResource copies the raw filesystem, gitignore or not — a
        // real incident: leftover `android/build`/`android/.gradle`
        // directories from local test builds (deeply nested Gradle
        // transform-cache folders, e.g. `jar_<hash>_bucket_0`) got shipped
        // inside a packaged stories-engine.exe and made Windows Explorer
        // refuse to copy the install folder ("chemin d'accès de
        // destination trop long"). These are pure build output — the
        // Android export pipeline (build.js's buildAndroidTarget) works
        // from a disposable temp copy of templates/game-shell and never
        // reads this app's own copy of android/build or .gradle — so
        // excluding them here is never a functional loss, only smaller +
        // safer packages.
        //
        ignore: [/[\\/]src-capacitor[\\/]android[\\/](.*[\\/])?(build|\.gradle)([\\/]|$)/],

        // templates/game-shell/node-runtime/<platform>-<arch>/ (see
        // scripts/vendor-node-runtime.mjs) ships one subfolder per editor
        // packaging target, but shellAssembly.js's VENDORED_NODE_BINARY
        // only ever reads the ONE matching the HOST machine actually
        // running the packaged editor — a Windows build never opens the
        // darwin/linux copies, and vice versa. Bundling all 4 into every
        // single target regardless — 2.2GB for the win32 package alone,
        // confirmed on a real build — is pure dead weight.
        //
        // NOT handled via the `ignore` option above — confirmed by
        // reading @electron/packager's own source (platform.js's
        // copyExtraResources): extraResource entries are copied with a
        // plain `fs.promises.cp(source, dest, {recursive:true})`, `ignore`
        // is never consulted for them at all, only for the main app
        // source tree. A regex here would silently do nothing (tried
        // first, confirmed by a real build that still shipped all 4
        // platforms). afterCopyExtraResources is a real documented
        // electron-packager hook that runs right after that copy, so this
        // deletes the unwanted subfolders from the STAGING copy instead
        // (per-target disposable tmpdir, never the live repo checkout) —
        // darwin builds both x64+arm64 in one invocation (`-A all`, see
        // package.json's build:electron:mac), so both stay for that
        // target. ctx.targetName undefined/'all' (a plain `quasar build
        // -m electron` with no -T) keeps everything — safest fallback
        // when it's unclear which single platform is being built.
        afterCopyExtraResources: [
          (hookArgs) => {
            const KEEP_BY_TARGET = {
              win32: ['win32-x64'],
              linux: ['linux-x64'],
              darwin: ['darwin-x64', 'darwin-arm64'],
            }
            const ALL_RUNTIMES = Object.values(KEEP_BY_TARGET).flat()
            const keep = KEEP_BY_TARGET[ctx.targetName] || ALL_RUNTIMES
            const exclude = ALL_RUNTIMES.filter((p) => !keep.includes(p))
            if (exclude.length === 0) return

            // darwin's resources dir is nested inside the generated
            // <Name>.app bundle — found by its extension rather than
            // reconstructing electron-packager's own app-name sanitizing
            // logic, since that's an internal implementation detail this
            // config shouldn't have to stay in sync with.
            const resourcesDir =
              ctx.targetName === 'darwin'
                ? path.join(
                    hookArgs.buildPath,
                    fs.readdirSync(hookArgs.buildPath).find((e) => e.endsWith('.app')),
                    'Contents',
                    'Resources',
                  )
                : path.join(hookArgs.buildPath, 'resources')

            for (const platformArch of exclude) {
              fs.rmSync(path.join(resourcesDir, 'templates', 'game-shell', 'node-runtime', platformArch), {
                recursive: true,
                force: true,
              })
            }
          },
        ],
      },

      builder: {
        // https://www.electron.build/configuration

        appId: 'stories-engine',
      },
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (rolldownConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: [],
    },
  }
})

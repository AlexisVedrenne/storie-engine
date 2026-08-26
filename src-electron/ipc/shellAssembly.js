// Assembles a fresh temp copy of templates/game-shell/ + stories-engine's own
// src/engine and src/components (never a hand-maintained second copy of the
// phone engine, see docs/phase3-plan.md's "principe" section), then copies
// the currently open project's content into it. Shared by every consumer
// that needs a runnable copy of the current project as a real Quasar app —
// build.js's "export game" (`quasar build -m electron`) and
// webPreview.js's "preview on your phone" (`quasar dev --host`) — so there's
// only ever one place that knows what a shipped shell is made of.
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// stories-engine's own source root — `templates/game-shell` and the engine
// source this pipeline copies both live here. Running from source
// (`pnpm run dev:electron`, or a --skip-pkg build), that's the repo root
// (process.cwd()). Once packaged, none of that raw source exists inside the
// app's asar — it's shipped alongside it instead, via quasar.config.js's
// `electron.packager.extraResource: ['src', 'templates']`, which lands
// unpacked at process.resourcesPath/{src,templates} (see app.isPackaged).
export const APP_ROOT = app.isPackaged ? process.resourcesPath : process.cwd()
export const TEMPLATE_DIR = path.join(APP_ROOT, 'templates', 'game-shell')

// A real `pnpm install` of templates/game-shell/package.json (hoisted —
// see templates/game-shell/.npmrc — a flat node_modules with no internal
// symlinks, so it survives being moved/copied by whatever the user's
// install method is), run once ahead of time (`pnpm run vendor:game-
// shell`) and shipped as part of stories-engine itself (covered by the
// same extraResource copy as TEMPLATE_DIR, since it lives inside it) —
// never installed at runtime on the END USER's machine. That's the whole
// point: build.js/webPreview.js used to `pnpm install` fresh into every
// temp dir, which silently required the user's own machine to have pnpm +
// Node.js + internet access, none of which a packaged stories-engine.exe
// can assume.
//
// Copied (not junctioned) into every tmpDir despite the ~600MB size — a
// junction was tried first and DID work in-place, but broke Node's ESM
// loader (used to load quasar.config.js) once the vendored install and
// the OS temp dir ended up on different drive letters (a real install
// moved to D:\, temp dir on C:\ — confirmed by an actual repro: Node
// resolved a relative import inside the junctioned package by
// concatenating the temp path with the junction's real target instead of
// following it, producing a garbage nonexistent path). A real copy has no
// such failure mode — the extra few seconds per session is the safer
// trade.
export const VENDORED_NODE_MODULES = path.join(TEMPLATE_DIR, 'node_modules')

// @quasar/app-vite's electron mode needs `electron` + `@electron/packager`
// installed INSIDE src-electron/ specifically (it auto-provisions them
// there via a nested pnpm project the first time `quasar build -m
// electron` runs — see templates/game-shell/src-electron/package.json).
// Vendored ahead of time for the exact same reason as
// VENDORED_NODE_MODULES above: left unprovisioned, every build/preview
// would trigger that auto-install fresh inside the disposable tmpDir,
// silently requiring pnpm + internet on the END USER's machine at build
// time — and a failed/interrupted auto-install here doesn't make `quasar
// build` exit non-zero, it just skips packaging, which is what used to
// produce "le dossier packagé est introuvable" with no other clue why.
export const SRC_ELECTRON_NODE_MODULES = path.join(TEMPLATE_DIR, 'src-electron', 'node_modules')

// Same reasoning as SRC_ELECTRON_NODE_MODULES, for the Android export
// pipeline instead (@capacitor/core+cli+android — see build.js's
// buildAndroidTarget()). Only build.js's Android path actually needs this;
// harmless extra copy for webPreview.js's own callers.
export const SRC_CAPACITOR_NODE_MODULES = path.join(TEMPLATE_DIR, 'src-capacitor', 'node_modules')

// @quasar/app-vite's CLI entry point inside a given assembled shell —
// resolved from the COPIED node_modules (see assembleShell), so this
// only makes sense to call after assembleShell() has run for that tmpDir.
export function resolveQuasarCli(tmpDir) {
  return path.join(tmpDir, 'node_modules', '@quasar', 'app-vite', 'bin', 'quasar.js')
}

// A genuine, standalone Node.js binary (`pnpm run vendor:game-shell`
// downloads it once per platform, straight from nodejs.org — see that
// script), vendored for the same "zero dependency on the end user's
// machine" reason as everything else here. build.js/webPreview.js used to
// run the assembled shell's `quasar` CLI via THIS APP'S OWN electron
// binary in ELECTRON_RUN_AS_NODE=1 mode instead (via `process.execPath`) —
// cheaper to vendor, since every Electron build already embeds a real
// Node.js runtime. That seemed equivalent to plain Node.js from the CLI's
// own perspective, but isn't: `process.versions.electron` and
// `process.resourcesPath` stay defined even under ELECTRON_RUN_AS_NODE
// (confirmed with a real packaged build), and something inside
// @electron/packager's dependency chain branches on one of those — the
// packaging step for an EXPORTED game (never the outer editor's own
// packaging, which genuinely is invoked from a real Electron context and
// is expected to look "packaged") silently stopped right after extracting
// the target Electron zip, no error, exit code 0, which is exactly what
// produced "le dossier packagé est introuvable" with zero further clue. A
// real node binary has neither global set, and the exact same pipeline
// completes normally under it — confirmed end to end against a real
// assembled shell before this was wired in.
//
// Picked by the HOST platform running the (packaged) editor right now —
// `vendor:game-shell` downloads one node-runtime/<platform>-<arch>/ per
// editor packaging target (see scripts/vendor-node-runtime.mjs), but only
// the one matching process.platform/process.arch is ever read at runtime,
// same as the platform this code is actually executing on. A mac/linux
// packaged editor used to ship (and try to spawn) a Windows-only node.exe
// here — silently broke "export game"/"preview on phone" on every
// non-Windows copy of the editor.
const NODE_RUNTIME_DIR = path.join(
  TEMPLATE_DIR,
  'node-runtime',
  `${process.platform}-${process.arch}`,
)
export const VENDORED_NODE_BINARY = path.join(
  NODE_RUNTIME_DIR,
  process.platform === 'win32' ? 'node.exe' : 'bin/node',
)

// Same node-runtime download as VENDORED_NODE_BINARY (the full Node.js
// distribution archive, not just the bare node binary) also ships npm
// alongside it — needed on PATH for the spawned build: @quasar/app-vite's
// own electron-builder step shells out to whichever of pnpm/yarn/npm/bun
// it finds on PATH to `install --prod` the assembled shell's runtime deps
// (a no-op — its package.json has none — but it hard-fails with "Please
// install PNPM (recommended), Yarn, NPM or Bun" before even getting there
// if NONE of the four resolve, confirmed against a real build run with a
// bare-Windows PATH). build.js prepends this to the spawned process's PATH
// so plain `npm` resolves without requiring ANY of those on the end
// user's own machine. Windows' dist is flat (npm(.cmd) sits next to
// node.exe); mac/linux dists nest everything under bin/ instead.
export const VENDORED_NPM_DIR =
  process.platform === 'win32' ? NODE_RUNTIME_DIR : path.join(NODE_RUNTIME_DIR, 'bin')

// Pre-downloaded copy of the exact Electron zip the exported game's own
// electron-packager step needs (`pnpm run vendor:game-shell` populates
// this — see scripts/vendor-electron-cache.mjs) — read by build.js via the
// STORIE_ELECTRON_CACHE env var it sets before spawning, which
// templates/game-shell/quasar.config.js's `electron.packager.download.
// cacheRoot` then points @electron/packager at. Without it,
// @electron/packager falls back to its own default cache
// (%LOCALAPPDATA%/electron/Cache) — empty on a machine that's never run
// any Electron dev tool before, meaning a genuine end user's very first
// "Build" would silently need a real ~130MB network download despite this
// whole pipeline's entire point being that it never needs one. Not
// involved in webPreview.js at all — `quasar dev` never invokes
// electron-packager.
export const VENDORED_ELECTRON_CACHE = path.join(TEMPLATE_DIR, 'electron-cache')

// Async (fs.promises.cp, not fs.cpSync) — these copies run on Electron's
// main process (see registerBuildHandlers), and build.js's buildGame() now
// loops this across up to 4 platform targets in one click (see BUILD_
// TARGETS). A synchronous copy blocks the main thread for its whole
// duration; stacked 4x back to back with zero yield in between, that block
// got long enough for Chromium's own watchdog to consider the process dead
// mid-build — confirmed by a real run that died partway through the 2nd
// target with exit code 4294930435, no JS-catchable error anywhere in the
// call chain (a real test with a single target never showed this).
//
// Wrapped with process.noAsar — Electron's built-in fs patches intercept
// ANY path containing a `*.asar` path segment and try to read it as an
// asar archive, even for a plain recursive copy that just wants to treat
// it as an opaque file. The vendored `electron` npm package we're copying
// here legitimately ships a real file named default_app.asar (see
// VENDORED_NODE_MODULES), and fs.promises.cp's internal checkPaths/
// getStats calls fs.stat on it — triggering that interception and throwing
// "Invalid package <path>" (Electron's own asar-loader error, not
// filesystem corruption; confirmed via a real packaged-app run whose stack
// trace bottoms out in node:electron/js2c/node_init). fs.cpSync never hit
// this (different internal implementation), so it only surfaced once the
// crash fix above switched to fs.promises.cp. process.noAsar disables the
// interception for the duration of the copy, restored after — this is
// Electron's own documented escape hatch for exactly this situation, not a
// workaround we invented.
export async function cpAsarSafe(src, dest, options) {
  const prevNoAsar = process.noAsar
  process.noAsar = true
  try {
    await fs.promises.cp(src, dest, options)
  } finally {
    process.noAsar = prevNoAsar
  }
}

async function copyIfExists(src, dest) {
  if (fs.existsSync(src)) await cpAsarSafe(src, dest, { recursive: true })
}

// A seed bucket file only exists on disk once its editor tab has actually
// been saved at least once (project.js's saveSeedBucket writes it lazily) —
// loadProjectFromDisk tolerates that via loadDefaultOr's fallback, but
// GamePage.vue statically imports all 5 files unconditionally, so a project
// that never touched (say) the reels/photos tab breaks the build with an
// UNRESOLVED_IMPORT the moment copyIfExists above skips those two files.
// Backfills the same empty defaults project.js already treats as "unset"
// ({} for messages/dms, [] for posts/reels/photos) so the generated shell
// always has all 5 files regardless of what the project ever saved.
const SEED_BUCKET_DEFAULTS = { messages: '{}', dms: '{}', posts: '[]', reels: '[]', photos: '[]' }
function ensureSeedBucketFiles(seedDir) {
  fs.mkdirSync(seedDir, { recursive: true })
  for (const [bucket, empty] of Object.entries(SEED_BUCKET_DEFAULTS)) {
    const dest = path.join(seedDir, `${bucket}.js`)
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, `export default ${empty}\n`, 'utf-8')
  }
}

// Cache-busted dynamic import, same pattern as project.js's loadDefaultOr —
// this pipeline doesn't otherwise ever load game.js's actual content (only
// project.json's manifest, for the productName/output-folder slug).
async function loadGameConfig(rootPath) {
  const gamePath = path.join(rootPath, 'game.js')
  if (!fs.existsSync(gamePath)) return {}
  const mod = await import(pathToFileURL(gamePath).href + '?t=' + Date.now())
  return mod.default || {}
}

export async function assembleShell(tmpDir, rootPath) {
  if (!fs.existsSync(VENDORED_NODE_MODULES)) {
    throw new Error(
      'Dépendances du moteur de jeu introuvables (templates/game-shell/node_modules). ' +
        'Lance `pnpm run vendor:game-shell` à la racine de stories-engine avant de packager, ' +
        "ou avant d'utiliser Build/Preview web en développement.",
    )
  }
  if (!fs.existsSync(SRC_ELECTRON_NODE_MODULES)) {
    throw new Error(
      'Dépendances electron/packager introuvables (templates/game-shell/src-electron/node_modules). ' +
        'Lance `pnpm run vendor:game-shell` à la racine de stories-engine avant de packager, ' +
        "ou avant d'utiliser Build/Preview web en développement.",
    )
  }
  if (!fs.existsSync(VENDORED_NODE_BINARY)) {
    throw new Error(
      `Runtime Node.js introuvable (${VENDORED_NODE_BINARY}). ` +
        'Lance `pnpm run vendor:game-shell` à la racine de stories-engine avant de packager, ' +
        "ou avant d'utiliser Build/Preview web en développement.",
    )
  }
  // mac/linux node-runtime archives are extracted on whatever machine ran
  // `vendor:game-shell` — when that's Windows/NTFS (no Unix execute-bit
  // concept), the extracted node/npm/npx files land without +x. That bit
  // never gets fixed by the plain-copy extraResource step either (it just
  // preserves whatever mode the source file already had) — so a packaged
  // mac/linux editor could ship node/npm binaries neither vendoring nor
  // packaging ever made executable, EACCES the first time build.js/
  // webPreview.js try to spawn them. Cheap to just re-assert +x here,
  // every assembly, regardless of how the files got here.
  if (process.platform !== 'win32') {
    for (const bin of [VENDORED_NODE_BINARY, path.join(VENDORED_NPM_DIR, 'npm')]) {
      if (fs.existsSync(bin)) fs.chmodSync(bin, 0o755)
    }
  }
  // VENDORED_ELECTRON_CACHE is NOT checked here — webPreview.js (the other
  // caller of this function) never invokes electron-packager, so it has no
  // use for it and shouldn't be blocked by its absence. build.js checks it
  // itself, right before the one step that actually needs it.

  await cpAsarSafe(TEMPLATE_DIR, tmpDir, {
    recursive: true,
    filter: (src) => {
      if (
        src.includes(`${path.sep}engine-overrides${path.sep}`) ||
        src.endsWith('engine-overrides')
      )
        return false
      // Copied separately below (see VENDORED_NODE_MODULES's own comment)
      // — excluded here so it isn't walked/filtered file-by-file twice.
      if (src.includes(`${path.sep}node_modules`)) return false
      return true
    },
  })

  // The engine + phone UI are never duplicated by hand — copied fresh from
  // the editor's own current source every build.
  await copyIfExists(path.join(APP_ROOT, 'src', 'engine'), path.join(tmpDir, 'src', 'engine'))
  await copyIfExists(
    path.join(APP_ROOT, 'src', 'components', 'phone'),
    path.join(tmpDir, 'src', 'components', 'phone'),
  )
  await copyIfExists(
    path.join(APP_ROOT, 'src', 'components', 'apps'),
    path.join(tmpDir, 'src', 'components', 'apps'),
  )
  // Small utilities genuinely shared between the editor's own authoring
  // forms AND a plug-in app's EntryForm.vue (e.g. src/components/apps/
  // email/EmailEntryForm.vue) — entryTypeRegistry.js eagerly globs every
  // app's entryType.js (see src/engine/apps/entryTypeRegistry.js), which
  // statically imports that form component, so it's part of the RUNTIME
  // bundle graph too, not just the editor's. Living under src/editor/
  // (never copied here) broke every build the moment the email app was
  // added — moved here specifically so `quasar build -m electron` inside
  // this temp shell can actually resolve it.
  await copyIfExists(
    path.join(APP_ROOT, 'src', 'components', 'shared'),
    path.join(tmpDir, 'src', 'components', 'shared'),
  )
  await copyIfExists(path.join(APP_ROOT, 'src', 'boot'), path.join(tmpDir, 'src', 'boot'))
  await copyIfExists(path.join(APP_ROOT, 'src', 'i18n'), path.join(tmpDir, 'src', 'i18n'))
  await copyIfExists(path.join(APP_ROOT, 'src', 'css'), path.join(tmpDir, 'src', 'css'))
  // ChatThread.vue/DmThreadScreen.vue import '@/utils/chatTime' — confirmed
  // by an actual end-to-end test build (see docs/phase3-plan.md); grep
  // `src/components/**` for `from '@/...'` again if new engine code ever
  // adds another such top-level import, since nothing here catches that
  // automatically.
  await copyIfExists(path.join(APP_ROOT, 'src', 'utils'), path.join(tmpDir, 'src', 'utils'))

  // The one file that legitimately differs between editor and shipped game
  // (see templates/game-shell/engine-overrides/assets.js's own comment).
  fs.copyFileSync(
    path.join(TEMPLATE_DIR, 'engine-overrides', 'assets.js'),
    path.join(tmpDir, 'src', 'engine', 'assets.js'),
  )

  // Engine infra served from public/ (sounds, favicon) — same static-asset
  // mechanism the project's own images will use below.
  await copyIfExists(path.join(APP_ROOT, 'public', 'icons'), path.join(tmpDir, 'public', 'icons'))
  await copyIfExists(path.join(APP_ROOT, 'public', 'sounds'), path.join(tmpDir, 'public', 'sounds'))
  const favicon = path.join(APP_ROOT, 'public', 'favicon.ico')
  if (fs.existsSync(favicon)) fs.copyFileSync(favicon, path.join(tmpDir, 'public', 'favicon.ico'))

  // The project itself.
  const projectDataDir = path.join(tmpDir, 'src', 'project-data')
  fs.mkdirSync(projectDataDir, { recursive: true })
  for (const file of ['contacts.js', 'threads.js', 'game.js', 'project.json']) {
    const src = path.join(rootPath, file)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(projectDataDir, file))
  }
  await copyIfExists(path.join(rootPath, 'chapters'), path.join(projectDataDir, 'chapters'))
  await copyIfExists(path.join(rootPath, 'seed'), path.join(projectDataDir, 'seed'))
  ensureSeedBucketFiles(path.join(projectDataDir, 'seed'))
  await copyIfExists(path.join(rootPath, 'i18n'), path.join(projectDataDir, 'i18n'))
  await copyIfExists(path.join(rootPath, 'apps'), path.join(projectDataDir, 'apps'))
  await copyIfExists(path.join(rootPath, 'assets'), path.join(tmpDir, 'public', 'story-assets'))

  // Custom build icon (game.icon, see GameForm.vue) — @quasar/app-vite's
  // own default already points electron.packager.icon at
  // src-electron/electron-assets/icons/icon (extensionless, platform
  // suffix auto-appended), it just finds nothing there today since
  // templates/game-shell/ ships no such directory. A real .ico is required
  // on Windows for the packaged .exe's own icon (Explorer/taskbar) —
  // no PNG->ICO conversion here (no such dependency in this project), so a
  // .png-only source only gets the running window's title-bar icon
  // (BrowserWindow's `icon` option accepts plain PNG fine, see
  // electron-main.js), not the packaged .exe file icon. Documented
  // limitation, not a bug — see docs/phase3-plan.md. Harmless no-op for a
  // web-preview consumer (webPreview.js), which never packages an .exe.
  const gameConfig = await loadGameConfig(rootPath)
  if (gameConfig.icon) {
    const iconSrc = path.join(rootPath, 'assets', gameConfig.icon)
    if (fs.existsSync(iconSrc)) {
      const iconsDir = path.join(tmpDir, 'src-electron', 'electron-assets', 'icons')
      fs.mkdirSync(iconsDir, { recursive: true })
      fs.copyFileSync(iconSrc, path.join(iconsDir, `icon${path.extname(iconSrc)}`))
    }
  }

  // Name the generated app after the project rather than the generic
  // template default, and stamp its version onto the packaged .exe's own
  // file version metadata — electron-packager reads package.json's plain
  // "version" field for that. Harmless metadata-only write for a
  // webPreview.js consumer, which never packages anything.
  const manifestPath = path.join(rootPath, 'project.json')
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    : {}
  const pkgPath = path.join(tmpDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.productName = manifest.name || pkg.productName
  if (manifest.version) pkg.version = manifest.version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

  // Real copy — see VENDORED_NODE_MODULES's own comment for why this isn't
  // a junction/symlink. Async (see copyIfExists's own comment) — this is
  // the single biggest transfer in the whole pipeline (~600MB). Also the
  // one that actually contains a default_app.asar (see cpAsarSafe's own
  // comment) — this specific call is what surfaced the asar-interception
  // bug in the first place.
  await cpAsarSafe(VENDORED_NODE_MODULES, path.join(tmpDir, 'node_modules'), {
    recursive: true,
  })

  // See SRC_ELECTRON_NODE_MODULES's own comment — without this, `quasar
  // build -m electron`'s packager step auto-installs `electron` +
  // `@electron/packager` into this exact path on its own, requiring pnpm +
  // internet on whoever's machine runs this.
  await cpAsarSafe(SRC_ELECTRON_NODE_MODULES, path.join(tmpDir, 'src-electron', 'node_modules'), {
    recursive: true,
  })

  // See SRC_CAPACITOR_NODE_MODULES's own comment.
  await cpAsarSafe(SRC_CAPACITOR_NODE_MODULES, path.join(tmpDir, 'src-capacitor', 'node_modules'), {
    recursive: true,
  })
}

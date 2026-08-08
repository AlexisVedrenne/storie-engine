// Build pipeline — turns the currently open project into a standalone,
// packaged Electron game (see docs/phase3-plan.md). Assembles a runnable
// shell via shellAssembly.js (shared with webPreview.js), then runs
// `quasar build -m electron` inside it — via a vendored, standalone
// Node.js binary (see run()'s own comment), never a `pnpm`/`node` the end
// user's machine would have to provide.
import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import gradleSpawn from 'cross-spawn'
import {
  assembleShell,
  resolveQuasarCli,
  cpAsarSafe,
  VENDORED_NODE_BINARY,
  VENDORED_NPM_DIR,
  VENDORED_ELECTRON_CACHE,
} from './shellAssembly.js'
import { detectJdk, detectSdk, getJdkDir, getSdkDir } from './androidToolchain.js'
import { getToolchainRoot } from './android.js'

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

// Extracts a short human-readable "what's happening right now" line from
// raw build-tool output, for BuildStepper.vue's step-3 live stage text.
// None of these tools expose an actual percentage for the compile/package
// steps (only the JDK/SDK *download* in androidToolchain.js genuinely has
// bytes-based progress) — this is just the clearest single line seen so
// far, not a computed fraction.
const STAGE_PATTERNS = [
  /WAIT\s*•\s*(.+)$/, // quasar's own "App •  WAIT  • Rolldown • Compiling..."
  /^>\s*Task\s+:(.+)$/, // gradle's "> Task :app:compileReleaseJavaWithJavac"
  /^(Downloading .+)$/, // gradle wrapper's own first-run download line
]

function extractStage(line) {
  const clean = stripAnsi(line).trim()
  for (const pattern of STAGE_PATTERNS) {
    const match = clean.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

// Splits a raw stdout/stderr chunk into complete lines, feeding each to
// onStage() as they arrive — chunks don't align with line boundaries, so
// an incomplete trailing line is held back and prefixed onto the next
// chunk rather than parsed early.
function makeLineFeeder(onStage) {
  let buffer = ''
  return (chunk) => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const stage = extractStage(line)
      if (stage) onStage?.(stage)
    }
  }
}

// Runs the assembled shell's `quasar` CLI via VENDORED_NODE_BINARY (see
// that constant's own comment for why — this used to spawn this app's OWN
// electron binary in ELECTRON_RUN_AS_NODE=1 mode instead, which looked
// equivalent but silently broke the packager sub-step specifically).
// Returns the captured stdout+stderr tail even on success — `quasar build
// -m electron`'s own packager sub-step (electron-packager) can silently
// skip packaging (see buildGame()'s own Packaged-folder check) without
// making the overall quasar CLI exit non-zero, so a success exit code
// alone doesn't prove packaging actually ran. stdout is where that step's
// own progress/warnings print (confirmed against a real run: "App • WAIT
// • electron/packager • Bundling Application...", icon warnings, etc.) —
// previously discarded entirely, which is why a silent packager skip gave
// zero clue as to why. `onStage`, if given, is fed every line of live
// output for BuildStepper.vue's step-3 progress text (see extractStage()).
function run(scriptPath, args, cwd, extraEnv, onStage) {
  return new Promise((resolve, reject) => {
    const child = spawn(VENDORED_NODE_BINARY, [scriptPath, ...args], {
      cwd,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      stdio: 'pipe',
    })
    let stdout = ''
    let stderr = ''
    const feedLines = makeLineFeeder(onStage)
    child.stdout.on('data', (d) => {
      const s = d.toString()
      stdout += s
      feedLines(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      stderr += s
      feedLines(s)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      const output = `${stdout}${stderr}`.slice(-4000)
      if (code === 0) resolve(output)
      else reject(new Error(`"quasar ${args.join(' ')}" a échoué (code ${code})\n${output}`))
    })
  })
}

// 'none' | 'patch' | 'minor' | 'major' — the choice offered at build time
// (see EditorPage.vue's buildGame()). Missing/malformed current version
// falls back to "1.0.0" as the baseline, so a project's very first build
// with 'none' selected still ends up versioned rather than staying blank.
function bumpVersion(current, bumpType) {
  const [major, minor, patch] = String(current || '1.0.0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      return `${major}.${minor}.${patch}`
  }
}

function slugify(name) {
  return (
    String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'storie-game'
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Keep in sync with scripts/vendor-electron-cache.mjs (which pre-downloads
// the Electron zip each of these needs) and BuildStepper.vue's distribution
// checkboxes (which send back a subset of these `id`s, plus optionally
// 'android', as `targetIds`).
export const BUILD_TARGETS = [
  { id: 'win32-x64', platform: 'win32', arch: 'x64', label: 'Windows (x64)' },
  { id: 'darwin-x64', platform: 'darwin', arch: 'x64', label: 'macOS (Intel)' },
  { id: 'darwin-arm64', platform: 'darwin', arch: 'arm64', label: 'macOS (Apple Silicon)' },
  { id: 'linux-x64', platform: 'linux', arch: 'x64', label: 'Linux (x64)' },
]

// Windows commonly still holds a lock on some file inside tmpDir for a
// moment after the build's child processes have exited (electron.exe,
// antivirus scanning the freshly-written .exe, etc.) — EPERM here is
// transient, not a real failure. Retries a few times before giving up
// silently: a leftover temp folder is harmless (OS/user can clean it up),
// nowhere near as bad as this cleanup step's own failure masking whatever
// the actual build result was (see the try/finally below).
async function cleanupWithRetry(dir) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
      return
    } catch (err) {
      if (attempt === 4) {
        console.warn(`[stories-engine] could not remove temp build dir ${dir}:`, err.message)
        return
      }
      await sleep(300 * (attempt + 1))
    }
  }
}

// Builds ONE target into its own disposable tmpDir (never shared across
// targets — @quasar/app-vite's electron mode always writes to the same
// dist/electron/Packaged regardless of -T, so reusing one tmpDir across
// several -T runs would have each target's build wipe the previous one's
// output out from under it before it got copied to destPath).
async function buildTarget(rootPath, destPath, manifest, target, onStage) {
  const tmpDir = path.join(os.tmpdir(), `stories-engine-build-${Date.now()}-${target.id}`)
  try {
    await assembleShell(tmpDir, rootPath)
    const buildOutput = await run(
      resolveQuasarCli(tmpDir),
      ['build', '-m', 'electron', '-T', target.platform, '-A', target.arch],
      tmpDir,
      {
        STORIE_ELECTRON_CACHE: VENDORED_ELECTRON_CACHE,
        // See VENDORED_NPM_DIR's own comment — makes plain `npm` resolve for
        // the electron-builder step's own package-manager detection without
        // requiring pnpm/yarn/npm/bun on the end user's machine.
        PATH: `${VENDORED_NPM_DIR}${path.delimiter}${process.env.PATH}`,
      },
      onStage,
    )

    const packagedDir = path.join(tmpDir, 'dist', 'electron', 'Packaged')
    if (!fs.existsSync(packagedDir)) {
      throw new Error(
        'Le build a réussi mais le dossier packagé est introuvable (dist/electron/Packaged).\n' +
          buildOutput,
      )
    }

    const outDir = path.join(destPath, slugify(manifest.name), target.id)
    // cpAsarSafe, not a raw fs.promises.cp — see its own comment in
    // shellAssembly.js. packagedDir contains the packager's own app.asar,
    // so this copy is exactly as exposed to the asar-interception bug as
    // the vendored node_modules copy that first surfaced it.
    await cpAsarSafe(packagedDir, outDir, { recursive: true })
    return outDir
  } finally {
    // Never let a cleanup failure override/mask the actual build result —
    // this used to be a plain `fs.rmSync(...)` here, which on a Windows
    // EPERM (transient file lock) would replace a successful return value
    // with this cleanup error instead, hiding that the build had worked.
    await cleanupWithRetry(tmpDir)
  }
}

// Bumped and written back to the PROJECT's own project.json (not just a
// temp build copy) before anything else — a build is what "release cut"
// means here, so the version increment has to actually stick for next
// time, same file assembleShell() reads moments later to stamp the
// packaged app's own version metadata. Shared by buildGame() (desktop) and
// the Android handler — same "a build is a release cut" rule either way.
function bumpAndSaveManifest(rootPath, bumpType) {
  const manifestPath = path.join(rootPath, 'project.json')
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    : {}
  manifest.version = bumpVersion(manifest.version, bumpType)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
  return manifest
}

// Runs gradlew directly (absolute path + cross-spawn), not through `quasar
// build -m capacitor`'s own gradle invocation step — that one shells out to
// a RELATIVE `./gradlew.bat` path via @quasar/app-vite's own spawn helper,
// which failed outright on a real test machine (cmd.exe couldn't find it,
// likely an OS hardening setting that disables searching the current
// directory for bare executable names — confirmed reproducible standalone,
// unrelated to this project's own code). Absolute path sidesteps it
// entirely. cross-spawn (not plain node:child_process), same EINVAL reason
// as androidToolchain.js's own runCommand — gradlew.bat can't be spawned
// directly on Windows without it.
function runGradle(gradlewBin, args, cwd, env, onStage) {
  return new Promise((resolve, reject) => {
    const child = gradleSpawn(gradlewBin, args, { cwd, env, stdio: 'pipe' })
    let output = ''
    const feedLines = makeLineFeeder(onStage)
    child.stdout.on('data', (d) => {
      const s = d.toString()
      output += s
      feedLines(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      output += s
      feedLines(s)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(output.slice(-4000))
      else reject(new Error(`"gradlew ${args.join(' ')}" a échoué (code ${code})\n${output.slice(-4000)}`))
    })
  })
}

// Distinct from buildTarget() (desktop/electron) — different mode
// (capacitor, not electron), different final step (gradlew, not
// electron-packager), different toolchain dependency (JDK+SDK, checked by
// the caller before this ever runs — see registerBuildHandlers). `quasar
// build -m capacitor -T android --skip-pkg` still does the web-asset build
// + `cap sync android` (proven reliable — same assembled-shell pipeline as
// every other target); only the actual gradle invocation is done by hand.
async function buildAndroidTarget(rootPath, destPath, manifest, toolchainRoot, onStage) {
  const tmpDir = path.join(os.tmpdir(), `stories-engine-build-${Date.now()}-android`)
  try {
    await assembleShell(tmpDir, rootPath)
    await run(
      resolveQuasarCli(tmpDir),
      ['build', '-m', 'capacitor', '-T', 'android', '--skip-pkg'],
      tmpDir,
      { PATH: `${VENDORED_NPM_DIR}${path.delimiter}${process.env.PATH}` },
      onStage,
    )

    const androidDir = path.join(tmpDir, 'src-capacitor', 'android')
    const gradlewBin = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
    const jdkDir = getJdkDir(toolchainRoot)
    const sdkDir = getSdkDir(toolchainRoot)
    await runGradle(
      gradlewBin,
      ['assembleRelease'],
      androidDir,
      { ...process.env, JAVA_HOME: jdkDir, ANDROID_HOME: sdkDir, ANDROID_SDK_ROOT: sdkDir },
      onStage,
    )

    const apkPath = path.join(
      androidDir,
      'app',
      'build',
      'outputs',
      'apk',
      'release',
      'app-release-unsigned.apk',
    )
    if (!fs.existsSync(apkPath)) {
      throw new Error(
        "Le build Gradle a réussi mais l'APK est introuvable (app/build/outputs/apk/release).",
      )
    }

    const outDir = path.join(destPath, slugify(manifest.name), 'android')
    fs.mkdirSync(outDir, { recursive: true })
    const outApk = path.join(outDir, `${slugify(manifest.name)}.apk`)
    await fs.promises.copyFile(apkPath, outApk)
    return outApk
  } finally {
    await cleanupWithRetry(tmpDir)
  }
}

// Android alongside BUILD_TARGETS' desktop entries — same shape (id/label),
// dispatched differently in buildOneTarget() below (capacitor+gradlew, not
// electron-packager). Single canonical order for BuildStepper.vue's step 3
// progress list, independent of whatever order the user ticked checkboxes
// in.
const ANDROID_TARGET = { id: 'android', label: 'Android (.apk)' }
const ALL_TARGETS = [...BUILD_TARGETS, ANDROID_TARGET]

async function buildOneTarget(id, rootPath, destPath, manifest, toolchainRoot, onStage) {
  if (id === 'android') {
    return buildAndroidTarget(rootPath, destPath, manifest, toolchainRoot, onStage)
  }
  const target = BUILD_TARGETS.find((t) => t.id === id)
  return buildTarget(rootPath, destPath, manifest, target, onStage)
}

// Single orchestrator for every distribution — BuildStepper.vue's step 2
// sends whichever ids were ticked (desktop + optionally 'android') and
// this drives them all through one combined destPath + one progress
// stream, instead of the two separate build flows (and two separate
// "where to export" dialogs) this used to be.
async function buildAll(rootPath, destPath, bumpType, targetIds, onProgress) {
  const targets = ALL_TARGETS.filter((t) => targetIds.includes(t.id))

  if (targets.some((t) => t.id !== 'android')) {
    // Checked here, not in shellAssembly.js's shared assembleShell() —
    // webPreview.js (the other caller) never invokes electron-packager, so
    // it has no use for this and shouldn't be blocked by its absence.
    if (!fs.existsSync(VENDORED_ELECTRON_CACHE)) {
      throw new Error(
        'Cache Electron introuvable (templates/game-shell/electron-cache). ' +
          'Lance `pnpm run vendor:game-shell` à la racine de stories-engine avant de packager.',
      )
    }
  }

  const toolchainRoot = targetIds.includes('android') ? getToolchainRoot() : null
  if (toolchainRoot && (!detectJdk(toolchainRoot) || !detectSdk(toolchainRoot))) {
    // BuildStepper.vue's step 2 is expected to have already checked +
    // installed this before ever letting the user reach step 3 — this is a
    // last-resort guard against calling it out of order, not the primary
    // UX path.
    throw new Error(
      "Toolchain Android (JDK/SDK) manquante ou incomplète. Relance l'installation depuis l'étape distribution.",
    )
  }

  const manifest = bumpAndSaveManifest(rootPath, bumpType)

  // Sequential, not Promise.all — every desktop target reinstalls a fresh
  // copy of the vendored node_modules/electron zip into its own tmpDir
  // (real I/O, see assembleShell()'s own comment on why it's a copy not a
  // symlink); running several of those concurrently (Android's gradle
  // build is its own heavy JVM process on top) is a bigger machine-resource
  // risk than the extra wall-clock time of doing them one at a time.
  const results = []
  const errors = []
  for (const target of targets) {
    onProgress?.({ id: target.id, label: target.label, status: 'building' })
    const onStage = (stage) =>
      onProgress?.({ id: target.id, label: target.label, status: 'building', stage })
    try {
      const outDir = await buildOneTarget(target.id, rootPath, destPath, manifest, toolchainRoot, onStage)
      results.push({ id: target.id, label: target.label, outDir })
      onProgress?.({ id: target.id, label: target.label, status: 'success', outDir })
    } catch (err) {
      const message = err.message || String(err)
      errors.push({ id: target.id, label: target.label, message })
      onProgress?.({ id: target.id, label: target.label, status: 'error', message })
    }
  }

  return { manifest, results, errors }
}

export function registerBuildHandlers(mainWindow) {
  ipcMain.handle('project:buildAll', async (_evt, { rootPath, bumpType, targetIds }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choisir où exporter le jeu',
    })
    if (result.canceled || !result.filePaths[0]) return null

    return buildAll(rootPath, result.filePaths[0], bumpType, targetIds, (progress) => {
      mainWindow.webContents.send('project:buildProgress', progress)
    })
  })
}

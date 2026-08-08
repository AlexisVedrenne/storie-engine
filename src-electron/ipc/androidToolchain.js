// Android export toolchain (JDK + SDK cmdline-tools) — downloaded on demand
// on whichever machine clicks "Export Android", NOT pre-vendored into the
// packaged stories-engine.exe the way electron-cache is (see build.js's own
// comments on that). JDK+SDK are 700MB+ combined and only needed by users
// who actually use this export target, so bundling them into every install
// would bloat the app for everyone else. Same one-time-download shape as
// Android Studio's own SDK Manager / Unity Hub's Android module.
//
// Every function here takes `toolchainRoot` explicitly rather than reading
// Electron's `app.getPath('userData')` itself — keeps this module runnable
// (and testable) outside a real Electron process; android.js's IPC layer is
// the only place that resolves the real path.
import fs from 'node:fs'
import path from 'node:path'
import spawn from 'cross-spawn'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import AdmZip from 'adm-zip'

// Pinned versions — bump deliberately, not "latest", so a build made today
// behaves the same next year. compileSdkVersion must stay in sync with
// templates/game-shell/src-capacitor/android/variables.gradle. JDK 21 (not
// 17) and build-tools 35 (not 36, despite compileSdk 36) aren't guesses —
// confirmed against a real gradlew assembleRelease run: AGP 8.13 (this
// capacitor scaffold's pinned version)/capacitor-android both compile with
// Java source/target release 21, and compileSdk 36 still resolves its
// actual build-tools dependency to 35.0.0, not 36.x (AGP quirk — 36.x
// wasn't available/wasn't what got auto-requested). JDK 17 failed with
// "invalid source release: 21".
const JDK_FEATURE_VERSION = '21'
const CMDLINE_TOOLS_BUILD = '15859902'
const ANDROID_PLATFORM = 'android-36'
const BUILD_TOOLS_VERSION = '35.0.0'

export function getJdkDir(toolchainRoot) {
  return path.join(toolchainRoot, 'jdk')
}

export function getSdkDir(toolchainRoot) {
  return path.join(toolchainRoot, 'sdk')
}

function getSdkmanagerBin(toolchainRoot) {
  return path.join(
    getSdkDir(toolchainRoot),
    'cmdline-tools',
    'latest',
    'bin',
    process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager',
  )
}

// Adoptium's binary API — see https://api.adoptium.net. `platform`/`arch`
// use Adoptium's own naming, not Node's process.platform/process.arch.
function getAdoptiumTarget() {
  const platform = { win32: 'windows', darwin: 'mac', linux: 'linux' }[process.platform]
  const arch = { x64: 'x64', arm64: 'aarch64' }[process.arch]
  if (!platform || !arch) {
    throw new Error(`Plateforme non supportée pour le JDK: ${process.platform}/${process.arch}`)
  }
  return { platform, arch }
}

// Google's cmdline-tools zip naming — see developer.android.com/studio.
// Confirmed against the real download URLs (dl.google.com, not the
// edgedl.me.gvt1.com host a web summary once suggested — that one 404s).
function getCmdlineToolsPlatformTag() {
  if (process.platform === 'win32') return 'win'
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac_arm64' : 'mac_x86_64'
  throw new Error(`Plateforme non supportée pour le SDK Android: ${process.platform}`)
}

export function detectJdk(toolchainRoot) {
  const javaBin = path.join(getJdkDir(toolchainRoot), 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  return fs.existsSync(javaBin)
}

export function detectSdk(toolchainRoot) {
  const sdkDir = getSdkDir(toolchainRoot)
  return (
    fs.existsSync(getSdkmanagerBin(toolchainRoot)) &&
    fs.existsSync(path.join(sdkDir, 'platform-tools')) &&
    fs.existsSync(path.join(sdkDir, 'platforms', ANDROID_PLATFORM)) &&
    fs.existsSync(path.join(sdkDir, 'build-tools', BUILD_TOOLS_VERSION))
  )
}

async function downloadFile(url, destPath, onProgress) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Téléchargement échoué (${res.status} ${res.statusText}): ${url}`)
  }
  const total = Number(res.headers.get('content-length')) || 0
  let received = 0
  const nodeStream = Readable.fromWeb(res.body)
  nodeStream.on('data', (chunk) => {
    received += chunk.length
    if (total) onProgress?.(received / total)
  })
  await pipeline(nodeStream, fs.createWriteStream(destPath))
}

// Extracts a zip whose content is a single top-level folder (true of both
// the JDK and cmdline-tools zips) directly INTO destDir, discarding that
// wrapper folder's own name — e.g. `jdk-17.0.13+11/bin/...` becomes
// `<destDir>/bin/...`. Used both for the JDK itself (destDir = jdkDir) and
// for cmdline-tools (destDir = sdkDir/cmdline-tools/latest — the exact
// layout sdkmanager requires, see Google's own docs on cmdline-tools
// placement).
function extractZipFlattenSingleRoot(zipPath, destDir) {
  const tmpExtract = `${destDir}.extract-tmp`
  fs.rmSync(tmpExtract, { recursive: true, force: true })
  new AdmZip(zipPath).extractAllTo(tmpExtract, true)

  const entries = fs.readdirSync(tmpExtract)
  if (entries.length !== 1) {
    throw new Error(
      `Archive inattendue (${entries.length} entrées à la racine, 1 attendue): ${zipPath}`,
    )
  }

  fs.rmSync(destDir, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(destDir), { recursive: true })
  fs.renameSync(path.join(tmpExtract, entries[0]), destDir)
  fs.rmSync(tmpExtract, { recursive: true, force: true })
}

// `cross-spawn`, not plain node:child_process — sdkmanager ships as a .bat
// on Windows, which plain child_process.spawn() can't exec directly (throws
// EINVAL); confirmed via a real run. Same underlying Windows limitation as
// the `./gradlew.bat` relative-path issue found earlier, different symptom.
// `shell: true` also "fixes" it but triggers Node's own unescaped-args
// security warning — cross-spawn (what @quasar/app-vite itself uses for
// this exact problem, see its lib/utils/spawn.js) handles both properly.
function runCommand(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (out += d.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(`"${cmd} ${args.join(' ')}" a échoué (code ${code})\n${out.slice(-2000)}`))
    })
  })
}

// sdkmanager --licenses prompts y/n per license interactively — there's no
// documented flag to skip this. Piping enough "y\n" answers is the standard
// workaround (same one CI setups for Android use). 20 is comfortably more
// than the ~7 licenses a fresh cmdline-tools install currently has.
function acceptLicenses(sdkmanagerBin, sdkDir, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(sdkmanagerBin, ['--licenses', `--sdk_root=${sdkDir}`], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (out += d.toString()))
    for (let i = 0; i < 20; i++) child.stdin.write('y\n')
    child.stdin.end()
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(`Acceptation des licences échouée (code ${code})\n${out.slice(-2000)}`))
    })
  })
}

// Downloads+installs whichever of JDK/SDK isn't already present under
// toolchainRoot. Idempotent — safe to call again after a partial failure,
// each piece is skipped if already detected.
export async function installToolchain(toolchainRoot, onProgress) {
  fs.mkdirSync(toolchainRoot, { recursive: true })

  if (!detectJdk(toolchainRoot)) {
    onProgress?.({ stage: 'jdk-download', percent: 0 })
    const { platform, arch } = getAdoptiumTarget()
    const url = `https://api.adoptium.net/v3/binary/latest/${JDK_FEATURE_VERSION}/ga/${platform}/${arch}/jdk/hotspot/normal/eclipse`
    const zipPath = path.join(toolchainRoot, 'jdk-download.zip')
    await downloadFile(url, zipPath, (percent) => onProgress?.({ stage: 'jdk-download', percent }))
    onProgress?.({ stage: 'jdk-extract', percent: 0 })
    extractZipFlattenSingleRoot(zipPath, getJdkDir(toolchainRoot))
    fs.rmSync(zipPath, { force: true })
  }

  const sdkDir = getSdkDir(toolchainRoot)
  const sdkmanagerBin = getSdkmanagerBin(toolchainRoot)
  if (!fs.existsSync(sdkmanagerBin)) {
    onProgress?.({ stage: 'sdk-download', percent: 0 })
    const url = `https://dl.google.com/android/repository/commandlinetools-${getCmdlineToolsPlatformTag()}-${CMDLINE_TOOLS_BUILD}_latest.zip`
    const zipPath = path.join(toolchainRoot, 'cmdline-tools-download.zip')
    await downloadFile(url, zipPath, (percent) => onProgress?.({ stage: 'sdk-download', percent }))
    onProgress?.({ stage: 'sdk-extract', percent: 0 })
    extractZipFlattenSingleRoot(zipPath, path.join(sdkDir, 'cmdline-tools', 'latest'))
    fs.rmSync(zipPath, { force: true })
  }

  const env = { ...process.env, JAVA_HOME: getJdkDir(toolchainRoot) }

  onProgress?.({ stage: 'sdk-licenses', percent: 0 })
  await acceptLicenses(sdkmanagerBin, sdkDir, env)

  onProgress?.({ stage: 'sdk-packages', percent: 0 })
  await runCommand(
    sdkmanagerBin,
    [`--sdk_root=${sdkDir}`, 'platform-tools', `platforms;${ANDROID_PLATFORM}`, `build-tools;${BUILD_TOOLS_VERSION}`],
    { env },
  )

  onProgress?.({ stage: 'done', percent: 1 })
}

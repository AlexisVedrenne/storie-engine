// Builds the Stories Engine EDITOR itself (not a player's exported story —
// that's src-electron/ipc/build.js, run from inside the editor) for every
// desktop target, zips each one, and publishes them as a GitHub Release —
// one command, run locally by a maintainer.
//
// Usage: node scripts/release.mjs <version>   e.g. node scripts/release.mjs 0.1.0
//
// Requires: GitHub CLI (`gh`) installed and authenticated (`gh auth login`,
// 'repo' scope) — this script shells out to it to create the release.
// Never runs in CI, never needs a token stored anywhere: gh handles its own
// auth, and version/tag/release are all driven by the arg you pass here.
//
// package.json's "version" field is bumped just long enough for
// build:electron:all to stamp it onto each packaged binary, then restored
// to its original committed value (see the try/finally below) — this
// script never commits or pushes anything to git, so it works the same
// whether master/release/dev are branch-protected or not.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import AdmZip from 'adm-zip'

const ROOT = path.join(fileURLToPath(new URL('.', import.meta.url)), '..')
const version = process.argv[2]

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/release.mjs <version>  (e.g. 0.1.0, no leading "v")')
  process.exit(1)
}
const tag = `v${version}`

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    throw new Error(`"${command} ${args.join(' ')}" a échoué (code ${result.status})`)
  }
}

// Same targets as src-electron/ipc/build.js's BUILD_TARGETS + the Android-
// less desktop set package.json's build:electron:all script produces —
// kept here as plain data since this script never imports Electron main-
// process code (it isn't running inside Electron at all).
const TARGETS = [
  { dir: 'dist/electron-win32/Packaged/Stories Engine-win32-x64', slug: 'windows-x64' },
  { dir: 'dist/electron-linux/Packaged/Stories Engine-linux-x64', slug: 'linux-x64' },
  { dir: 'dist/electron-darwin/Packaged/Stories Engine-darwin-x64', slug: 'macos-intel' },
  { dir: 'dist/electron-darwin/Packaged/Stories Engine-darwin-arm64', slug: 'macos-arm64' },
]

const NODE_RUNTIME_DIR = path.join(ROOT, 'templates', 'game-shell', 'node-runtime')
const NEEDED_RUNTIME_SUBDIRS = ['win32-x64', 'darwin-x64', 'darwin-arm64', 'linux-x64']
const gameShellVendored =
  fs.existsSync(path.join(ROOT, 'templates', 'game-shell', 'node_modules')) &&
  NEEDED_RUNTIME_SUBDIRS.every((d) => fs.existsSync(path.join(NODE_RUNTIME_DIR, d)))

if (!gameShellVendored) {
  console.log('templates/game-shell pas (ou plus) vendoré — vendor:game-shell...')
  run('pnpm', ['run', 'vendor:game-shell'])
} else {
  console.log('templates/game-shell déjà vendoré, on saute vendor:game-shell.')
}

const pkgPath = path.join(ROOT, 'package.json')
const originalPkgText = fs.readFileSync(pkgPath, 'utf-8')
const restorePkg = () => fs.writeFileSync(pkgPath, originalPkgText, 'utf-8')

// try/finally alone only covers a thrown JS error (e.g. the build
// failing) — a Ctrl+C (SIGINT) or a killed terminal ends the process
// immediately, skipping the finally below entirely and leaving
// package.json stuck on the bumped version (confirmed by a real
// interrupted run before this was added). Explicit handlers cover that.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    restorePkg()
    process.exit(1)
  })
}

try {
  const pkg = JSON.parse(originalPkgText)
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

  run('pnpm', ['run', 'build:electron:all'])
} finally {
  // Restored right after the build, whether it succeeded or not — this
  // script never commits/pushes, so package.json must never end up
  // sitting locally modified for longer than the build actually needs it.
  restorePkg()
}

for (const { dir } of TARGETS) {
  if (!fs.existsSync(path.join(ROOT, dir))) {
    throw new Error(`Build attendu introuvable : ${dir} — build:electron:all a-t-il bien tourné ?`)
  }
}

const assetsDir = path.join(ROOT, 'release-assets')
fs.rmSync(assetsDir, { recursive: true, force: true })
fs.mkdirSync(assetsDir, { recursive: true })

const zipPaths = []
for (const { dir, slug } of TARGETS) {
  const zipPath = path.join(assetsDir, `stories-engine-${slug}-${tag}.zip`)
  console.log(`\nZip ${dir} -> ${zipPath}`)
  const zip = new AdmZip()
  zip.addLocalFolder(path.join(ROOT, dir))
  zip.writeZip(zipPath)
  zipPaths.push(zipPath)
}

console.log(`\nPublication de la release ${tag} sur GitHub...`)
run('gh', ['release', 'create', tag, ...zipPaths, '--title', tag, '--generate-notes'])

console.log(`\nRelease ${tag} publiée.`)

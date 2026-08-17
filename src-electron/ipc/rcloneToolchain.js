// rclone binary — downloaded on demand the first time the author uses Cloud
// sync (see docs/cloud-sync-rclone-plan.md), NOT bundled into the editor
// installer (rclone itself is only ~20-30MB, but there's no reason to grow
// every install for a feature most users won't touch on day one). Same
// one-time-download shape as the Android JDK/SDK toolchain
// (androidToolchain.js) — `toolchainRoot` is passed in explicitly for the
// same reason (testable outside a real Electron process; cloudSync.js's IPC
// layer resolves the real path via app.getPath('userData')).
import fs from 'node:fs'
import path from 'node:path'
import { downloadFile, extractZipFlattenSingleRoot } from './downloadUtils.js'

// Pinned version — bump deliberately, not "latest"/"current", so a build
// made today behaves the same next year (same reasoning as the JDK/SDK
// pins in androidToolchain.js). Bump by changing this one constant.
const RCLONE_VERSION = '1.68.2'

function getRcloneTarget() {
  const platform = { win32: 'windows', darwin: 'osx', linux: 'linux' }[process.platform]
  const arch = { x64: 'amd64', arm64: 'arm64', ia32: '386' }[process.arch]
  if (!platform || !arch) {
    throw new Error(`Plateforme non supportée pour rclone: ${process.platform}/${process.arch}`)
  }
  return { platform, arch }
}

export function getRcloneDir(toolchainRoot) {
  return path.join(toolchainRoot, 'rclone')
}

export function getRcloneBin(toolchainRoot) {
  return path.join(
    getRcloneDir(toolchainRoot),
    process.platform === 'win32' ? 'rclone.exe' : 'rclone',
  )
}

export function detectRclone(toolchainRoot) {
  return fs.existsSync(getRcloneBin(toolchainRoot))
}

// Idempotent — safe to call again after a partial failure (downloadFile
// writes to a temp zip path that's only renamed/extracted on success).
export async function installRclone(toolchainRoot, onProgress) {
  if (detectRclone(toolchainRoot)) {
    onProgress?.({ stage: 'done', percent: 1 })
    return
  }

  fs.mkdirSync(toolchainRoot, { recursive: true })
  const { platform, arch } = getRcloneTarget()

  onProgress?.({ stage: 'rclone-download', percent: 0 })
  const url = `https://downloads.rclone.org/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-${platform}-${arch}.zip`
  const zipPath = path.join(toolchainRoot, 'rclone-download.zip')
  await downloadFile(url, zipPath, (percent) => onProgress?.({ stage: 'rclone-download', percent }))

  onProgress?.({ stage: 'rclone-extract', percent: 0 })
  extractZipFlattenSingleRoot(zipPath, getRcloneDir(toolchainRoot))
  fs.rmSync(zipPath, { force: true })

  // The zip doesn't preserve the executable bit reliably across every
  // platform/zip-tool combination — set it explicitly rather than trust
  // adm-zip's extraction on macOS/Linux.
  if (process.platform !== 'win32') {
    fs.chmodSync(getRcloneBin(toolchainRoot), 0o755)
  }

  onProgress?.({ stage: 'done', percent: 1 })
}

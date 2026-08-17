// Shared download/extract helpers for on-demand external toolchains — used
// by androidToolchain.js (JDK/SDK) and rcloneToolchain.js (see
// docs/cloud-sync-rclone-plan.md). Extracted here rather than duplicated:
// both are "fetch a zip from a pinned URL, flatten its single root folder
// onto disk, report progress" with zero tool-specific behavior in the
// mechanics themselves.
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import AdmZip from 'adm-zip'

export async function downloadFile(url, destPath, onProgress) {
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

// Extracts a zip whose content is a single top-level folder directly INTO
// destDir, discarding that wrapper folder's own name — e.g.
// `jdk-17.0.13+11/bin/...` becomes `<destDir>/bin/...`.
export function extractZipFlattenSingleRoot(zipPath, destDir) {
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

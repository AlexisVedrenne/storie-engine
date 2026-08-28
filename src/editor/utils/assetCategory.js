// Shared by AssetField.vue (per-field preview) and AssetsPanel.vue (Assets
// tab grid) — extension-based, not content-sniffed, matches how every
// other asset-path convention in this app already works (a plain relative
// string, no metadata).
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov'])

export function categorizeAsset(assetPath) {
  const ext = (assetPath || '').split('.').pop().toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (VIDEO_EXT.has(ext)) return 'video'
  return 'other'
}

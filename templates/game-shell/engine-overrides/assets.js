// Replaces src/engine/assets.js AFTER src/engine/ has been copied fresh
// from stories-engine into the shell build (see src-electron/ipc/build.js) —
// the only file in the whole engine that legitimately differs between
// editor and shipped game, because the two run in different environments:
// the editor resolves an image through Electron's `storie-asset://`
// protocol against whichever project is currently open, while a shipped
// game has its assets baked into public/story-assets/ at build time and
// just needs a plain static URL, exactly like NTR's /sounds/*.mp3 today.
// Relative, not root-absolute: a packaged Electron app loads index.html via
// `file://`, where a leading "/" resolves to the filesystem root, not the
// app folder — confirmed by an actual test build (see docs/phase3-plan.md)
// where index.html's own asset tags are all relative (`./assets/...`) for
// exactly this reason. `public/story-assets/` ends up a sibling of
// index.html in every build output, so `./story-assets/...` resolves
// correctly regardless of whether this runs from `file://` or `http://`.
export function resolveAssetUrl(relPath) {
  if (!relPath) return relPath
  return `./story-assets/${String(relPath).replace(/\\/g, '/')}`
}

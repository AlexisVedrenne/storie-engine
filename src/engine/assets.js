// Resolves a project-relative asset path (e.g. "images/mira/parc_4.png",
// see docs/editor-plan-phase1.md decision #1) into an actual usable URL.
// Every component that binds an <img>/media src coming from project data
// (contact avatars, message/post/story images, seed content...) must go
// through this instead of using the raw string directly.
//
// Phase 1 only implements the editor-preview branch: the currently open
// project's assets/ folder is served through a custom Electron protocol
// (see src-electron/electron-main.js's `storie-asset://` handler + the
// `project:load` IPC call that sets the main process's current assets
// root). Phase 3's Build pipeline will add a second branch here for the
// built game, where assets are copied to a static public/ folder instead.
export function resolveAssetUrl(relPath) {
  if (!relPath) return relPath;
  return `storie-asset://project/${String(relPath).replace(/\\/g, "/")}`;
}

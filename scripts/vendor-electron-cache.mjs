// Pre-downloads the exact Electron zip that the exported-game shell's own
// electron-packager step needs, into templates/game-shell/electron-cache —
// see templates/game-shell/quasar.config.js's `packager.download.cacheRoot`
// and shellAssembly.js's comment on why this pipeline avoids anything the
// end user's machine would have to fetch itself.
//
// Without this, @electron/packager's own cache (normally
// %LOCALAPPDATA%/electron/Cache, a per-machine, per-user directory OUTSIDE
// this project entirely) starts out empty on a fresh machine — a genuine
// end user who downloads the packaged storie-engine.exe and has never run
// any other Electron dev tool before would hit a real, unvendored ~90MB
// network download the first time they click "Build", silently
// contradicting this whole pipeline's "zero dependency on the end user's
// machine" goal. Vendoring the zip itself (shipped alongside node_modules
// via the same `templates` extraResource copy) closes that gap the same
// way VENDORED_NODE_MODULES/VENDORED_NODE_BINARY already do for their own
// dependencies.
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const templateDir = path.join(repoRoot, "templates", "game-shell");
const cacheRoot = path.join(templateDir, "electron-cache");

// @electron/get only exists inside templates/game-shell's OWN vendored
// node_modules (not this outer repo's), so it's resolved with an explicit
// path rather than a bare specifier — a plain `import "@electron/get"`
// here would resolve against scripts/'s own node_modules lookup, which
// doesn't have it. Loaded via the CJS entry through `createRequire`
// (not the package's own "module"/esm build, whose extensionless relative
// imports fail to resolve when loaded outside its own package context via
// a raw dynamic `import()`).
const require = createRequire(import.meta.url);
const { downloadArtifact } = require(path.join(templateDir, "node_modules", "@electron", "get", "dist", "cjs", "index.js"));

// Matches templates/game-shell/package.json's own pinned "electron"
// devDependency (see quasar.config.js's `electron.packager` — it doesn't
// pin a version itself, so @electron/packager infers it from this
// package's installed `electron` version at build time).
const { version } = JSON.parse(
  await fs.readFile(path.join(templateDir, "node_modules", "electron", "package.json"), "utf-8"),
);

console.log(`Téléchargement du zip Electron v${version} (win32/x64) dans le cache vendoré...`);
const zipPath = await downloadArtifact({
  version,
  platform: "win32",
  arch: "x64",
  artifactName: "electron",
  cacheRoot,
});
console.log(`Zip Electron vendoré : ${zipPath}`);

// Downloads a standalone Node.js distribution into templates/game-shell/
// node-runtime/ — see shellAssembly.js's VENDORED_NODE_BINARY /
// VENDORED_NPM_DIR for why build.js/webPreview.js need a REAL node.exe
// (not this app's own Electron binary in ELECTRON_RUN_AS_NODE mode) to run
// the assembled shell's quasar CLI, AND why npm specifically has to come
// along too: @quasar/app-vite's own electron-builder step shells out to
// whichever of pnpm/yarn/npm/bun it finds on PATH to `install --prod` the
// packaged app's runtime deps (a no-op here — the shell's own
// package.json has none — but it hard-fails before even getting there if
// NONE of the four resolve at all, confirmed against a real build with a
// bare-Windows PATH). The full node-vX.Y.Z-win-x64.zip (not just the
// single win-x64/node.exe file) ships npm alongside node.exe for exactly
// this reason — one download covers both.
//
// Run once by a maintainer via `pnpm run vendor:game-shell`, never at
// runtime on the end user's machine.
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const NODE_VERSION = "v24.18.0"; // keep in sync with package.json's "engines" range
const DIST_NAME = `node-${NODE_VERSION}-win-x64`;

const destDir = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "templates", "game-shell", "node-runtime");
const url = `https://nodejs.org/dist/${NODE_VERSION}/${DIST_NAME}.zip`;

function download(url, destFile) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location, destFile).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Téléchargement échoué (${res.statusCode}) : ${url}`));
          return;
        }
        const file = fs.createWriteStream(destFile);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

const tmpZip = path.join(os.tmpdir(), `${DIST_NAME}-${Date.now()}.zip`);
const tmpExtractDir = path.join(os.tmpdir(), `${DIST_NAME}-${Date.now()}-extracted`);

console.log(`Téléchargement de Node.js ${NODE_VERSION} (win-x64, distribution complète avec npm) depuis ${url}...`);
await download(url, tmpZip);

console.log("Extraction...");
execFileSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpExtractDir}' -Force`,
]);

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });
// The zip extracts to a single top-level `node-vX.Y.Z-win-x64/` folder —
// flattened out of it so VENDORED_NODE_BINARY/VENDORED_NPM_DIR's paths
// stay stable across Node version bumps instead of embedding the version
// string into every path that reads them.
fs.cpSync(path.join(tmpExtractDir, DIST_NAME), destDir, { recursive: true });

fs.rmSync(tmpZip, { force: true });
fs.rmSync(tmpExtractDir, { recursive: true, force: true });

console.log(`Runtime Node.js (+ npm) vendoré : ${destDir}`);

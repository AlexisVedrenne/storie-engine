// Downloads a standalone Node.js binary into templates/game-shell/node-
// runtime/node.exe — see shellAssembly.js's VENDORED_NODE_BINARY for why
// build.js/webPreview.js need a REAL node.exe (not this app's own Electron
// binary in ELECTRON_RUN_AS_NODE mode) to run the assembled shell's quasar
// CLI. Run once by a maintainer via `pnpm run vendor:game-shell`, never at
// runtime on the end user's machine.
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "v24.18.0"; // keep in sync with package.json's "engines" range

const destDir = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "templates", "game-shell", "node-runtime");
const destFile = path.join(destDir, "node.exe");
const url = `https://nodejs.org/dist/${NODE_VERSION}/win-x64/node.exe`;

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

fs.mkdirSync(destDir, { recursive: true });
console.log(`Téléchargement de Node.js ${NODE_VERSION} (win-x64) depuis ${url}...`);
await download(url, destFile);
console.log(`Runtime Node.js vendoré : ${destFile}`);

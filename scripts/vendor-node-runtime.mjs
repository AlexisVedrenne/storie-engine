// Downloads a standalone Node.js distribution for EACH platform the editor
// itself gets packaged for (see quasar.config.js's electron.packager +
// BUILD_TARGETS in src-electron/ipc/build.js) into
// templates/game-shell/node-runtime/<platform>-<arch>/ — see
// shellAssembly.js's VENDORED_NODE_BINARY/VENDORED_NPM_DIR for why
// build.js/webPreview.js need a REAL node binary (not this app's own
// Electron binary in ELECTRON_RUN_AS_NODE mode) to run the assembled
// shell's quasar CLI, AND why npm specifically has to come along too:
// @quasar/app-vite's own electron-builder step shells out to whichever of
// pnpm/yarn/npm/bun it finds on PATH to `install --prod` the packaged
// app's runtime deps (a no-op here — the shell's own package.json has
// none — but it hard-fails before even getting there if NONE of the four
// resolve at all, confirmed against a real build with a bare-Windows
// PATH). The full node distribution archive (not just the bare node
// binary) ships npm alongside it for exactly this reason — one download
// covers both.
//
// Previously vendored win-x64 only, flattened straight into node-runtime/
// — that binary is picked up by whichever OS the PACKAGED EDITOR itself
// runs on (shellAssembly.js's build.js/webPreview.js spawn it from the
// running editor's own main process), so a packaged mac/linux editor
// shipping a Windows-only node.exe could never actually run it: the
// "export game"/"preview on phone" pipeline would fail on every non-
// Windows copy of the editor. Per-platform subfolders + shellAssembly.js
// picking the right one via process.platform/process.arch fixes that.
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

// Keep in sync with src-electron/ipc/build.js's BUILD_TARGETS (the editor's
// own packaging targets) — each entry here is one nodejs.org dist name.
const TARGETS = [
  { platformArch: "win32-x64", distName: `node-${NODE_VERSION}-win-x64`, ext: "zip" },
  { platformArch: "darwin-x64", distName: `node-${NODE_VERSION}-darwin-x64`, ext: "tar.gz" },
  { platformArch: "darwin-arm64", distName: `node-${NODE_VERSION}-darwin-arm64`, ext: "tar.gz" },
  { platformArch: "linux-x64", distName: `node-${NODE_VERSION}-linux-x64`, ext: "tar.gz" },
];

const runtimeRoot = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "templates",
  "game-shell",
  "node-runtime",
);

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

// .zip (win) needs Expand-Archive (Windows) or unzip (mac/linux); .tar.gz
// (mac/linux dists) extracts fine via `tar` on all three (Windows 10+
// ships a real tar.exe too) — so tar.gz never needs a platform branch,
// only zip does.
function extract(archivePath, ext, destDir) {
  if (ext === "zip") {
    if (process.platform === "win32") {
      execFileSync("powershell.exe", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`,
      ]);
    } else {
      execFileSync("unzip", ["-q", archivePath, "-d", destDir]);
    }
  } else {
    fs.mkdirSync(destDir, { recursive: true });
    // Windows' bundled bsdtar misparses a `C:\...` path two ways: the
    // colon after the drive letter reads as an `[user@]host:path`
    // remote-shell target (--force-local fixes that), and backslashes get
    // mangled once --force-local is on (confirmed by a real run — bsdtar
    // then reports the path back with doubled backslashes and "No such
    // file or directory"). Forward slashes sidestep both — Windows'
    // filesystem APIs (and this bsdtar) accept them just as well as
    // backslashes, and GNU tar (mac/linux) never cared either way.
    const toTarPath = (p) => (process.platform === "win32" ? p.replaceAll("\\", "/") : p);
    execFileSync("tar", [
      "xzf",
      toTarPath(archivePath),
      "-C",
      toTarPath(destDir),
      "--force-local",
    ]);
  }
}

for (const { platformArch, distName, ext } of TARGETS) {
  const url = `https://nodejs.org/dist/${NODE_VERSION}/${distName}.${ext}`;
  const destDir = path.join(runtimeRoot, platformArch);
  const tmpArchive = path.join(os.tmpdir(), `${distName}-${Date.now()}.${ext}`);
  const tmpExtractDir = path.join(os.tmpdir(), `${distName}-${Date.now()}-extracted`);

  console.log(`Téléchargement de Node.js ${NODE_VERSION} (${platformArch}) depuis ${url}...`);
  await download(url, tmpArchive);

  console.log(`Extraction (${platformArch})...`);
  extract(tmpArchive, ext, tmpExtractDir);

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  // Each archive extracts to a single top-level `node-vX.Y.Z-<platform>-
  // <arch>/` folder — flattened out of it so VENDORED_NODE_BINARY/
  // VENDORED_NPM_DIR's paths stay stable across Node version bumps
  // instead of embedding the version string into every path that reads
  // them.
  fs.cpSync(path.join(tmpExtractDir, distName), destDir, { recursive: true });

  fs.rmSync(tmpArchive, { force: true });
  fs.rmSync(tmpExtractDir, { recursive: true, force: true });

  console.log(`Runtime Node.js (+ npm) vendoré (${platformArch}) : ${destDir}`);
}

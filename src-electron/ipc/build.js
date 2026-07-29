// Build pipeline — turns the currently open project into a standalone,
// packaged Electron game (see docs/phase3-plan.md). Assembles a fresh temp
// copy of templates/game-shell/ + storie-engine's own src/engine and
// src/components (never a hand-maintained second copy of the phone engine,
// see the plan doc's "principe" section), copies the open project's
// content into it, then runs `quasar build -m electron` inside it.
import { app, ipcMain, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

// storie-engine's own source root — `templates/game-shell` and the engine
// source this pipeline copies both live here. Running from source
// (`pnpm run dev:electron`, or a --skip-pkg build), that's the repo root
// (process.cwd()). Once packaged, none of that raw source exists inside the
// app's asar — it's shipped alongside it instead, via quasar.config.js's
// `electron.packager.extraResource: ['src', 'templates']`, which lands
// unpacked at process.resourcesPath/{src,templates} (see app.isPackaged).
const APP_ROOT = app.isPackaged ? process.resourcesPath : process.cwd();
const TEMPLATE_DIR = path.join(APP_ROOT, "templates", "game-shell");

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true, stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${cmd} ${args.join(" ")}" a échoué (code ${code})\n${stderr.slice(-4000)}`));
    });
  });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
}

// Cache-busted dynamic import, same pattern as project.js's loadDefaultOr —
// build.js doesn't otherwise ever load game.js's actual content (only
// project.json's manifest, for the productName/output-folder slug).
async function loadGameConfig(rootPath) {
  const gamePath = path.join(rootPath, "game.js");
  if (!fs.existsSync(gamePath)) return {};
  const mod = await import(pathToFileURL(gamePath).href + "?t=" + Date.now());
  return mod.default || {};
}

async function assembleShell(tmpDir, rootPath) {
  fs.cpSync(TEMPLATE_DIR, tmpDir, { recursive: true, filter: (src) => !src.includes(`${path.sep}engine-overrides${path.sep}`) && !src.endsWith("engine-overrides") });

  // The engine + phone UI are never duplicated by hand — copied fresh from
  // the editor's own current source every build.
  copyIfExists(path.join(APP_ROOT, "src", "engine"), path.join(tmpDir, "src", "engine"));
  copyIfExists(path.join(APP_ROOT, "src", "components", "phone"), path.join(tmpDir, "src", "components", "phone"));
  copyIfExists(path.join(APP_ROOT, "src", "components", "apps"), path.join(tmpDir, "src", "components", "apps"));
  copyIfExists(path.join(APP_ROOT, "src", "boot"), path.join(tmpDir, "src", "boot"));
  copyIfExists(path.join(APP_ROOT, "src", "i18n"), path.join(tmpDir, "src", "i18n"));
  copyIfExists(path.join(APP_ROOT, "src", "css"), path.join(tmpDir, "src", "css"));
  // ChatThread.vue/DmThreadScreen.vue import '@/utils/chatTime' — confirmed
  // by an actual end-to-end test build (see docs/phase3-plan.md); grep
  // `src/components/**` for `from '@/...'` again if new engine code ever
  // adds another such top-level import, since nothing here catches that
  // automatically.
  copyIfExists(path.join(APP_ROOT, "src", "utils"), path.join(tmpDir, "src", "utils"));

  // The one file that legitimately differs between editor and shipped game
  // (see templates/game-shell/engine-overrides/assets.js's own comment).
  fs.copyFileSync(
    path.join(TEMPLATE_DIR, "engine-overrides", "assets.js"),
    path.join(tmpDir, "src", "engine", "assets.js"),
  );

  // Engine infra served from public/ (sounds, favicon) — same static-asset
  // mechanism the project's own images will use below.
  copyIfExists(path.join(APP_ROOT, "public", "icons"), path.join(tmpDir, "public", "icons"));
  copyIfExists(path.join(APP_ROOT, "public", "sounds"), path.join(tmpDir, "public", "sounds"));
  const favicon = path.join(APP_ROOT, "public", "favicon.ico");
  if (fs.existsSync(favicon)) fs.copyFileSync(favicon, path.join(tmpDir, "public", "favicon.ico"));

  // The project itself.
  const projectDataDir = path.join(tmpDir, "src", "project-data");
  fs.mkdirSync(projectDataDir, { recursive: true });
  for (const file of ["contacts.js", "threads.js", "game.js", "project.json"]) {
    const src = path.join(rootPath, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(projectDataDir, file));
  }
  copyIfExists(path.join(rootPath, "chapters"), path.join(projectDataDir, "chapters"));
  copyIfExists(path.join(rootPath, "seed"), path.join(projectDataDir, "seed"));
  copyIfExists(path.join(rootPath, "i18n"), path.join(projectDataDir, "i18n"));
  copyIfExists(path.join(rootPath, "assets"), path.join(tmpDir, "public", "story-assets"));

  // Custom build icon (game.icon, see GameForm.vue) — @quasar/app-vite's
  // own default already points electron.packager.icon at
  // src-electron/electron-assets/icons/icon (extensionless, platform
  // suffix auto-appended), it just finds nothing there today since
  // templates/game-shell/ ships no such directory. A real .ico is required
  // on Windows for the packaged .exe's own icon (Explorer/taskbar) —
  // no PNG->ICO conversion here (no such dependency in this project), so a
  // .png-only source only gets the running window's title-bar icon
  // (BrowserWindow's `icon` option accepts plain PNG fine, see
  // electron-main.js), not the packaged .exe file icon. Documented
  // limitation, not a bug — see docs/phase3-plan.md.
  const gameConfig = await loadGameConfig(rootPath);
  if (gameConfig.icon) {
    const iconSrc = path.join(rootPath, "assets", gameConfig.icon);
    if (fs.existsSync(iconSrc)) {
      const iconsDir = path.join(tmpDir, "src-electron", "electron-assets", "icons");
      fs.mkdirSync(iconsDir, { recursive: true });
      fs.copyFileSync(iconSrc, path.join(iconsDir, `icon${path.extname(iconSrc)}`));
    }
  }

  // Name the generated app after the project rather than the generic
  // template default, and stamp its version (bumped by buildGame() below,
  // BEFORE this runs) onto the packaged .exe's own file version metadata —
  // electron-packager reads package.json's plain "version" field for that.
  const manifestPath = path.join(rootPath, "project.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
  const pkgPath = path.join(tmpDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.productName = manifest.name || pkg.productName;
  if (manifest.version) pkg.version = manifest.version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}

// 'none' | 'patch' | 'minor' | 'major' — the choice offered at build time
// (see EditorPage.vue's buildGame()). Missing/malformed current version
// falls back to "1.0.0" as the baseline, so a project's very first build
// with 'none' selected still ends up versioned rather than staying blank.
function bumpVersion(current, bumpType) {
  const [major, minor, patch] = String(current || "1.0.0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return `${major}.${minor}.${patch}`;
  }
}

function slugify(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "storie-game"
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Windows commonly still holds a lock on some file inside tmpDir for a
// moment after the build's child processes have exited (electron.exe,
// antivirus scanning the freshly-written .exe, etc.) — EPERM here is
// transient, not a real failure. Retries a few times before giving up
// silently: a leftover temp folder is harmless (OS/user can clean it up),
// nowhere near as bad as this cleanup step's own failure masking whatever
// the actual build result was (see the try/finally below).
async function cleanupWithRetry(dir) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (attempt === 4) {
        console.warn(`[storie-engine] could not remove temp build dir ${dir}:`, err.message);
        return;
      }
      await sleep(300 * (attempt + 1));
    }
  }
}

async function buildGame(rootPath, destPath, bumpType) {
  // Bumped and written back to the PROJECT's own project.json (not just the
  // temp build copy) before anything else — a build is what "release cut"
  // means here, so the version increment has to actually stick for next
  // time, same file assembleShell() below reads moments later to stamp the
  // packaged .exe's own version metadata.
  const manifestPath = path.join(rootPath, "project.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
  manifest.version = bumpVersion(manifest.version, bumpType);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  const tmpDir = path.join(os.tmpdir(), `storie-engine-build-${Date.now()}`);
  try {
    await assembleShell(tmpDir, rootPath);

    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    await run(pnpmCmd, ["install"], tmpDir);
    await run(pnpmCmd, ["exec", "quasar", "build", "-m", "electron"], tmpDir);

    const packagedDir = path.join(tmpDir, "dist", "electron", "Packaged");
    if (!fs.existsSync(packagedDir)) {
      throw new Error("Le build a réussi mais le dossier packagé est introuvable (dist/electron/Packaged).");
    }

    const outDir = path.join(destPath, slugify(manifest.name));
    fs.cpSync(packagedDir, outDir, { recursive: true });
    return { outDir, manifest };
  } finally {
    // Never let a cleanup failure override/mask the actual build result —
    // this used to be a plain `fs.rmSync(...)` here, which on a Windows
    // EPERM (transient file lock) would replace a successful return value
    // with this cleanup error instead, hiding that the build had worked.
    await cleanupWithRetry(tmpDir);
  }
}

export function registerBuildHandlers(mainWindow) {
  ipcMain.handle("project:build", async (_evt, { rootPath, bumpType }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "Choisir où exporter le jeu",
    });
    if (result.canceled || !result.filePaths[0]) return null;

    return buildGame(rootPath, result.filePaths[0], bumpType);
  });
}

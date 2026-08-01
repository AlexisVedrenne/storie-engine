// Assembles a fresh temp copy of templates/game-shell/ + storie-engine's own
// src/engine and src/components (never a hand-maintained second copy of the
// phone engine, see docs/phase3-plan.md's "principe" section), then copies
// the currently open project's content into it. Shared by every consumer
// that needs a runnable copy of the current project as a real Quasar app —
// build.js's "export game" (`quasar build -m electron`) and
// webPreview.js's "preview on your phone" (`quasar dev --host`) — so there's
// only ever one place that knows what a shipped shell is made of.
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// storie-engine's own source root — `templates/game-shell` and the engine
// source this pipeline copies both live here. Running from source
// (`pnpm run dev:electron`, or a --skip-pkg build), that's the repo root
// (process.cwd()). Once packaged, none of that raw source exists inside the
// app's asar — it's shipped alongside it instead, via quasar.config.js's
// `electron.packager.extraResource: ['src', 'templates']`, which lands
// unpacked at process.resourcesPath/{src,templates} (see app.isPackaged).
export const APP_ROOT = app.isPackaged ? process.resourcesPath : process.cwd();
export const TEMPLATE_DIR = path.join(APP_ROOT, "templates", "game-shell");

// A real `pnpm install` of templates/game-shell/package.json (hoisted —
// see templates/game-shell/.npmrc — a flat node_modules with no internal
// symlinks, so it survives being moved/copied by whatever the user's
// install method is), run once ahead of time (`pnpm run vendor:game-
// shell`) and shipped as part of storie-engine itself (covered by the
// same extraResource copy as TEMPLATE_DIR, since it lives inside it) —
// never installed at runtime on the END USER's machine. That's the whole
// point: build.js/webPreview.js used to `pnpm install` fresh into every
// temp dir, which silently required the user's own machine to have pnpm +
// Node.js + internet access, none of which a packaged storie-engine.exe
// can assume.
//
// Copied (not junctioned) into every tmpDir despite the ~600MB size — a
// junction was tried first and DID work in-place, but broke Node's ESM
// loader (used to load quasar.config.js) once the vendored install and
// the OS temp dir ended up on different drive letters (a real install
// moved to D:\, temp dir on C:\ — confirmed by an actual repro: Node
// resolved a relative import inside the junctioned package by
// concatenating the temp path with the junction's real target instead of
// following it, producing a garbage nonexistent path). A real copy has no
// such failure mode — the extra few seconds per session is the safer
// trade.
export const VENDORED_NODE_MODULES = path.join(TEMPLATE_DIR, "node_modules");

// @quasar/app-vite's CLI entry point inside a given assembled shell —
// resolved from the COPIED node_modules (see assembleShell), so this
// only makes sense to call after assembleShell() has run for that tmpDir.
export function resolveQuasarCli(tmpDir) {
  return path.join(tmpDir, "node_modules", "@quasar", "app-vite", "bin", "quasar.js");
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
}

// Cache-busted dynamic import, same pattern as project.js's loadDefaultOr —
// this pipeline doesn't otherwise ever load game.js's actual content (only
// project.json's manifest, for the productName/output-folder slug).
async function loadGameConfig(rootPath) {
  const gamePath = path.join(rootPath, "game.js");
  if (!fs.existsSync(gamePath)) return {};
  const mod = await import(pathToFileURL(gamePath).href + "?t=" + Date.now());
  return mod.default || {};
}

export async function assembleShell(tmpDir, rootPath) {
  if (!fs.existsSync(VENDORED_NODE_MODULES)) {
    throw new Error(
      "Dépendances du moteur de jeu introuvables (templates/game-shell/node_modules). " +
        "Lance `pnpm run vendor:game-shell` à la racine de storie-engine avant de packager, " +
        "ou avant d'utiliser Build/Preview web en développement.",
    );
  }

  fs.cpSync(TEMPLATE_DIR, tmpDir, {
    recursive: true,
    filter: (src) => {
      if (src.includes(`${path.sep}engine-overrides${path.sep}`) || src.endsWith("engine-overrides")) return false;
      // Copied separately below (see VENDORED_NODE_MODULES's own comment)
      // — excluded here so it isn't walked/filtered file-by-file twice.
      if (src.includes(`${path.sep}node_modules`)) return false;
      return true;
    },
  });

  // The engine + phone UI are never duplicated by hand — copied fresh from
  // the editor's own current source every build.
  copyIfExists(path.join(APP_ROOT, "src", "engine"), path.join(tmpDir, "src", "engine"));
  copyIfExists(path.join(APP_ROOT, "src", "components", "phone"), path.join(tmpDir, "src", "components", "phone"));
  copyIfExists(path.join(APP_ROOT, "src", "components", "apps"), path.join(tmpDir, "src", "components", "apps"));
  // Small utilities genuinely shared between the editor's own authoring
  // forms AND a plug-in app's EntryForm.vue (e.g. src/components/apps/
  // email/EmailEntryForm.vue) — entryTypeRegistry.js eagerly globs every
  // app's entryType.js (see src/engine/apps/entryTypeRegistry.js), which
  // statically imports that form component, so it's part of the RUNTIME
  // bundle graph too, not just the editor's. Living under src/editor/
  // (never copied here) broke every build the moment the email app was
  // added — moved here specifically so `quasar build -m electron` inside
  // this temp shell can actually resolve it.
  copyIfExists(path.join(APP_ROOT, "src", "components", "shared"), path.join(tmpDir, "src", "components", "shared"));
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
  // limitation, not a bug — see docs/phase3-plan.md. Harmless no-op for a
  // web-preview consumer (webPreview.js), which never packages an .exe.
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
  // template default, and stamp its version onto the packaged .exe's own
  // file version metadata — electron-packager reads package.json's plain
  // "version" field for that. Harmless metadata-only write for a
  // webPreview.js consumer, which never packages anything.
  const manifestPath = path.join(rootPath, "project.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : {};
  const pkgPath = path.join(tmpDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.productName = manifest.name || pkg.productName;
  if (manifest.version) pkg.version = manifest.version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

  // Real copy — see VENDORED_NODE_MODULES's own comment for why this isn't
  // a junction/symlink.
  fs.cpSync(VENDORED_NODE_MODULES, path.join(tmpDir, "node_modules"), { recursive: true });
}

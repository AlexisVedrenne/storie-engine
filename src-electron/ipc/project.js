// Project loading pipeline for the editor's Phase 1 read-only preview (see
// docs/editor-plan-phase1.md). Runs entirely in the main process: opens a
// folder dialog, dynamically imports every .js file in a project folder
// (chapters, contacts, threads, game, seed, i18n dictionaries) and assembles
// a plain, IPC-clonable ProjectData object for the renderer's
// story.loadProject(data) action.
import { ipcMain, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";

// Read by electron-main.js's `storie-asset://` protocol handler so it knows
// which project's assets/ folder to resolve relative paths against.
let currentAssetsRoot = null;

export function getCurrentAssetsRoot() {
  return currentAssetsRoot;
}

// Cache-busting query param defeats Node's ESM module cache — re-opening the
// same project after an on-disk edit (without restarting Electron) must
// reflect the change, not the stale cached module.
async function importFresh(absPath) {
  const url = pathToFileURL(absPath).href + "?t=" + Date.now();
  return import(url);
}

async function loadDefaultOr(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  const mod = await importFresh(absPath);
  return mod.default ?? fallback;
}

async function scanChapters(dir, baseDir = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await scanChapters(full, baseDir)));
    } else if (entry.name.endsWith(".js")) {
      const mod = await importFresh(full);
      out.push({
        ...(mod.default ?? mod),
        __sourceFile: path.relative(baseDir, full).replace(/\\/g, "/"),
      });
    }
  }
  return out;
}

async function loadI18n(rootDir) {
  const i18nDir = path.join(rootDir, "i18n");
  const out = {};
  if (!fs.existsSync(i18nDir)) return out;
  for (const localeDir of fs.readdirSync(i18nDir, { withFileTypes: true })) {
    if (!localeDir.isDirectory()) continue;
    out[localeDir.name] = {};
    const bucketDir = path.join(i18nDir, localeDir.name);
    for (const file of fs.readdirSync(bucketDir)) {
      if (!file.endsWith(".js")) continue;
      const bucket = path.basename(file, ".js");
      out[localeDir.name][bucket] = await loadDefaultOr(path.join(bucketDir, file), {});
    }
  }
  return out;
}

async function loadProjectFromDisk(rootPath) {
  const manifestPath = path.join(rootPath, "project.json");
  // project.json is plain JSON, not a JS module — read + JSON.parse
  // directly, never importFresh() (no import-attribute ceremony needed for
  // one manifest file).
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    : { name: path.basename(rootPath) };

  const chaptersDir = path.join(rootPath, "chapters");
  let chapters = fs.existsSync(chaptersDir) ? await scanChapters(chaptersDir) : [];

  // deterministic ordering: honor project.json's chapterOrder if present,
  // otherwise fall back to directory-scan order (not cross-platform
  // guaranteed — a phase 2 concern to make explicit/editable in the UI).
  if (Array.isArray(manifest.chapterOrder) && manifest.chapterOrder.length) {
    const byId = new Map(chapters.map((c) => [c.id, c]));
    const ordered = manifest.chapterOrder.map((id) => byId.get(id)).filter(Boolean);
    const remaining = chapters.filter((c) => !manifest.chapterOrder.includes(c.id));
    chapters = [...ordered, ...remaining];
  } else {
    console.warn(
      "[storie-engine] project.json has no chapterOrder — chapter order follows directory scan, which is not guaranteed stable across platforms.",
    );
  }

  const contacts = await loadDefaultOr(path.join(rootPath, "contacts.js"), []);
  const threads = await loadDefaultOr(path.join(rootPath, "threads.js"), []);
  const gameConfig = await loadDefaultOr(path.join(rootPath, "game.js"), {
    title: manifest.name || "",
  });

  const seedDir = path.join(rootPath, "seed");
  const seed = {
    messages: await loadDefaultOr(path.join(seedDir, "messages.js"), {}),
    dms: await loadDefaultOr(path.join(seedDir, "dms.js"), {}),
    posts: await loadDefaultOr(path.join(seedDir, "posts.js"), []),
    reels: await loadDefaultOr(path.join(seedDir, "reels.js"), []),
    photos: await loadDefaultOr(path.join(seedDir, "photos.js"), []),
  };

  const i18nDict = await loadI18n(rootPath);

  currentAssetsRoot = path.join(rootPath, "assets");

  const projectData = {
    rootPath,
    manifest,
    chapters,
    contacts,
    threads,
    gameConfig,
    seed,
    i18n: i18nDict,
    assetsRoot: "assets",
  };

  // Defensive: guarantees the blob is actually IPC-clonable (plain data, no
  // functions/Map/class instances a project file might have accidentally
  // exported) and doubles as an implicit assertion that the "chapters stay
  // pure data" convention (see docs/editor-plan-phase1.md decision #1) held.
  return JSON.parse(JSON.stringify(projectData));
}

// Phase 2 — write-back helpers (editing, see docs/phase2-plan.md).

function readManifest(rootPath) {
  const manifestPath = path.join(rootPath, "project.json");
  return fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    : { name: path.basename(rootPath) };
}

function writeManifest(rootPath, manifest) {
  fs.writeFileSync(path.join(rootPath, "project.json"), JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

// Renderer only builds a syntactically-valid JS literal (see
// src/project/serializeChapter.js) — Prettier applies the project's actual
// style (.prettierrc.json) right before it touches disk, here in main.
async function formatJs(source) {
  return prettier.format(source, {
    parser: "babel",
    plugins: [babelPlugin, estreePlugin],
    semi: false,
    singleQuote: true,
    printWidth: 100,
  });
}

function slugify(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "chapter";
}

export function registerProjectHandlers(mainWindow) {
  ipcMain.handle("project:selectFolder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Ouvrir un projet",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("project:load", async (_evt, rootPath) => {
    return loadProjectFromDisk(rootPath);
  });

  // Writes an already-serialized chapter (see serializeChapter.js) to its
  // source file, formatted with Prettier right before hitting disk.
  ipcMain.handle("project:saveChapter", async (_evt, { rootPath, sourceFile, source }) => {
    const formatted = await formatJs(source);
    const dest = path.join(rootPath, "chapters", sourceFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, formatted, "utf-8");
    return true;
  });

  // Creates a new (empty) chapter file + registers it in project.json's
  // chapterOrder. `source` is the already-serialized `export default {...}`
  // for `{ id, title, requires: null, timeline: [] }`, built renderer-side
  // with the same serializeChapter() used for saves.
  ipcMain.handle("project:createChapter", async (_evt, { rootPath, id, source }) => {
    const manifest = readManifest(rootPath);
    const sourceFile = `${slugify(id)}.js`;
    const dest = path.join(rootPath, "chapters", sourceFile);
    if (fs.existsSync(dest)) {
      throw new Error(`Un chapitre existe déjà pour ce nom de fichier : ${sourceFile}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, await formatJs(source), "utf-8");

    manifest.chapterOrder = Array.isArray(manifest.chapterOrder) ? manifest.chapterOrder : [];
    manifest.chapterOrder.push(id);
    writeManifest(rootPath, manifest);

    return { manifest, sourceFile };
  });

  // Deletion confirmation is the renderer's job (a q-dialog before this is
  // ever called) — this handler just does the actual file removal.
  ipcMain.handle("project:deleteChapter", async (_evt, { rootPath, sourceFile, id }) => {
    const target = path.join(rootPath, "chapters", sourceFile);
    if (fs.existsSync(target)) fs.unlinkSync(target);

    const manifest = readManifest(rootPath);
    if (Array.isArray(manifest.chapterOrder)) {
      manifest.chapterOrder = manifest.chapterOrder.filter((cid) => cid !== id);
    }
    writeManifest(rootPath, manifest);
    return manifest;
  });

  ipcMain.handle("project:reorderChapters", async (_evt, { rootPath, chapterOrder }) => {
    const manifest = readManifest(rootPath);
    manifest.chapterOrder = chapterOrder;
    writeManifest(rootPath, manifest);
    return manifest;
  });

  // contacts.js / threads.js / game.js are flat single files (no per-item
  // file, no manifest bookkeeping) — add/remove is in-memory array mutation
  // renderer-side, always followed by a full overwrite here.
  ipcMain.handle("project:saveContacts", async (_evt, { rootPath, source }) => {
    fs.writeFileSync(path.join(rootPath, "contacts.js"), await formatJs(source), "utf-8");
    return true;
  });

  ipcMain.handle("project:saveThreads", async (_evt, { rootPath, source }) => {
    fs.writeFileSync(path.join(rootPath, "threads.js"), await formatJs(source), "utf-8");
    return true;
  });

  ipcMain.handle("project:saveGame", async (_evt, { rootPath, source }) => {
    fs.writeFileSync(path.join(rootPath, "game.js"), await formatJs(source), "utf-8");
    return true;
  });

  // Opens a file picker rooted at the project's assets/ folder, returns a
  // path relative to it (what image/media fields store) — rejects a pick
  // made outside assets/ rather than silently writing an unusable path.
  ipcMain.handle("project:pickAsset", async (_evt, { rootPath }) => {
    const assetsRoot = path.join(rootPath, "assets");
    fs.mkdirSync(assetsRoot, { recursive: true });
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choisir une image",
      defaultPath: assetsRoot,
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "svg", "webp"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const picked = result.filePaths[0];
    const rel = path.relative(assetsRoot, picked);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("L'image choisie doit être à l'intérieur du dossier assets/ du projet.");
    }
    return rel.replace(/\\/g, "/");
  });
}

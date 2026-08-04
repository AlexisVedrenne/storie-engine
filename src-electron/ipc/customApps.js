// Persistence + export/import for author-built "custom apps" (see
// src/components/phone/customApps/ for the runtime interpreter and
// src/editor/components/CustomAppEditor.vue for the block builder) — a
// non-dev-authored phone app made of a fixed catalog of visual blocks
// (header/text/image/row/card/...), stored as ONE PURE JSON FILE per app in
// the project's apps/ folder, deliberately NOT a `.js` module like
// chapters/contacts/game (see the module comment below on why).
//
// Named `customApp` throughout (not just `app`) to avoid confusion with the
// unrelated, pre-existing `src/engine/apps/` — the registry for the 5
// hand-coded built-in apps (Messages/Pixly/Gallery/Calls/Settings). These
// are a distinct, data-driven system merged with that registry at runtime
// (see story.js's `mergedAppRegistry` getter).
import { ipcMain, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { slugify } from "./project.js";

// Plain JSON, never a JS module: (1) no code to execute means an app shared
// by a stranger (see exportCustomApp/importCustomApp below) can never smuggle
// arbitrary logic — it's inert data, parsed not executed; (2) reading it back
// is a plain `JSON.parse`, no dynamic `import()`/cache-busting ceremony
// needed the way project.js's `.js` project files require (JSON.parse always
// reads fresh from disk, there's no module cache to defeat).
export function scanCustomApps(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() || !entry.name.endsWith(".json")) continue;
    const full = path.join(dir, entry.name);
    const data = JSON.parse(fs.readFileSync(full, "utf-8"));
    out.push({ ...data, __sourceFile: entry.name });
  }
  return out;
}

// Recursively collects every block's `src` (image/avatar blocks) across a
// screen's block tree, including inside `card` blocks (which nest their own
// `blocks[]`) — used by exportCustomApp to know which project assets to
// bundle into the .zip.
// Exported alongside scanCustomApps purely so a standalone Node script can
// exercise the export/import path logic without needing a running Electron
// main process (dialog/ipcMain aren't available outside one) — not used by
// any other module.
export function collectAssetRefs(blocks, out = []) {
  for (const block of blocks || []) {
    if (typeof block.src === "string" && block.src) out.push(block.src);
    if (Array.isArray(block.blocks)) collectAssetRefs(block.blocks, out);
  }
  return out;
}

// Returns a deep-cloned block tree with every `src` passed through `mapFn` —
// used by importCustomApp to repoint each block at the asset's new location
// inside the IMPORTING project (see the `imported/<id>/` namespacing below).
export function rewriteBlockSrcs(blocks, mapFn) {
  return (blocks || []).map((block) => {
    const next = { ...block };
    if (typeof next.src === "string" && next.src) next.src = mapFn(next.src);
    if (Array.isArray(next.blocks)) next.blocks = rewriteBlockSrcs(next.blocks, mapFn);
    return next;
  });
}

export function registerCustomAppHandlers(mainWindow) {
  ipcMain.handle("project:saveCustomApp", async (_evt, { rootPath, sourceFile, data }) => {
    const dest = path.join(rootPath, "apps", sourceFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return true;
  });

  ipcMain.handle("project:createCustomApp", async (_evt, { rootPath, id, data }) => {
    const sourceFile = `${slugify(id)}.json`;
    const dest = path.join(rootPath, "apps", sourceFile);
    if (fs.existsSync(dest)) {
      throw new Error(`Une application existe déjà pour cet identifiant : ${sourceFile}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return { sourceFile };
  });

  ipcMain.handle("project:deleteCustomApp", async (_evt, { rootPath, sourceFile }) => {
    const target = path.join(rootPath, "apps", sourceFile);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return true;
  });

  // Bundles the app's JSON + every asset it references into a single .zip —
  // without the assets, sharing just the JSON leaves referenced images
  // behind (broken on the receiving end). Asset paths inside the zip mirror
  // the project's own assets/-relative structure exactly (e.g.
  // "images/fanpage/banner.png" stays that path both inside assets/ on disk
  // and inside the zip's assets/ folder) — no path rewriting needed on
  // export, only on import (see below), since only import changes where the
  // assets actually land.
  ipcMain.handle("project:exportCustomApp", async (_evt, { rootPath, sourceFile }) => {
    const src = path.join(rootPath, "apps", sourceFile);
    if (!fs.existsSync(src)) throw new Error("Application introuvable.");
    const appData = JSON.parse(fs.readFileSync(src, "utf-8"));

    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exporter l'application",
      defaultPath: `${appData.id || "app"}.zip`,
      filters: [{ name: "Storie App", extensions: ["zip"] }],
    });
    if (result.canceled || !result.filePath) return null;

    const zip = new AdmZip();
    zip.addFile("app.json", Buffer.from(JSON.stringify(appData, null, 2), "utf-8"));

    const assetsRoot = path.join(rootPath, "assets");
    const refs = [];
    for (const screen of appData.screens || []) collectAssetRefs(screen.blocks, refs);
    const uniqueRefs = [...new Set(refs)];
    for (const rel of uniqueRefs) {
      const assetPath = path.join(assetsRoot, rel);
      if (!fs.existsSync(assetPath)) continue;
      const zipFolder = path.join("assets", path.dirname(rel)).replace(/\\/g, "/");
      zip.addLocalFile(assetPath, zipFolder);
    }

    zip.writeZip(result.filePath);
    return true;
  });

  // Reverse of the above: extracts a shared .zip into THIS project. The id
  // is de-collided against apps already here (suffix -2/-3...), and every
  // bundled asset is copied under assets/imported/<id>/ — a dedicated
  // namespace so an imported app can never silently overwrite an unrelated
  // asset already in this project that happens to share a filename/path.
  // Block `src` fields are rewritten to match (see rewriteBlockSrcs).
  ipcMain.handle("project:importCustomApp", async (_evt, { rootPath }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Importer une application",
      properties: ["openFile"],
      filters: [{ name: "Storie App", extensions: ["zip"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const zip = new AdmZip(result.filePaths[0]);
    const jsonEntry = zip.getEntry("app.json");
    if (!jsonEntry) throw new Error("Fichier .zip invalide (app.json manquant).");
    const appData = JSON.parse(zip.readAsText(jsonEntry));

    const appsDir = path.join(rootPath, "apps");
    fs.mkdirSync(appsDir, { recursive: true });

    const existingIds = new Set(scanCustomApps(appsDir).map((a) => a.id));
    const baseId = slugify(appData.id || "app");
    let id = baseId;
    let n = 2;
    while (existingIds.has(id)) {
      id = `${baseId}-${n}`;
      n += 1;
    }

    const importDir = `imported/${id}`;
    const destAssetsDir = path.join(rootPath, "assets", importDir);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory || !entry.entryName.startsWith("assets/")) continue;
      const rel = entry.entryName.slice("assets/".length);
      const destPath = path.join(destAssetsDir, rel);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
    }

    const rewritten = {
      ...appData,
      id,
      screens: (appData.screens || []).map((screen) => ({
        ...screen,
        blocks: rewriteBlockSrcs(screen.blocks, (rel) => `${importDir}/${rel}`),
      })),
    };

    const sourceFile = `${id}.json`;
    fs.writeFileSync(path.join(appsDir, sourceFile), JSON.stringify(rewritten, null, 2) + "\n", "utf-8");

    return { ...rewritten, __sourceFile: sourceFile };
  });
}

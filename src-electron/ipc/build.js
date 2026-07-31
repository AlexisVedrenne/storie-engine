// Build pipeline — turns the currently open project into a standalone,
// packaged Electron game (see docs/phase3-plan.md). Assembles a runnable
// shell via shellAssembly.js (shared with webPreview.js), then runs
// `quasar build -m electron` inside it.
import { ipcMain, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { assembleShell } from "./shellAssembly.js";

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

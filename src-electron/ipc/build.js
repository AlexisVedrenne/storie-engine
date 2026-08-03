// Build pipeline — turns the currently open project into a standalone,
// packaged Electron game (see docs/phase3-plan.md). Assembles a runnable
// shell via shellAssembly.js (shared with webPreview.js), then runs
// `quasar build -m electron` inside it — via a vendored, standalone
// Node.js binary (see run()'s own comment), never a `pnpm`/`node` the end
// user's machine would have to provide.
import { ipcMain, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import {
  assembleShell,
  resolveQuasarCli,
  VENDORED_NODE_BINARY,
  VENDORED_NPM_DIR,
  VENDORED_ELECTRON_CACHE,
} from "./shellAssembly.js";

// Runs the assembled shell's `quasar` CLI via VENDORED_NODE_BINARY (see
// that constant's own comment for why — this used to spawn this app's OWN
// electron binary in ELECTRON_RUN_AS_NODE=1 mode instead, which looked
// equivalent but silently broke the packager sub-step specifically).
// Returns the captured stdout+stderr tail even on success — `quasar build
// -m electron`'s own packager sub-step (electron-packager) can silently
// skip packaging (see buildGame()'s own Packaged-folder check) without
// making the overall quasar CLI exit non-zero, so a success exit code
// alone doesn't prove packaging actually ran. stdout is where that step's
// own progress/warnings print (confirmed against a real run: "App • WAIT
// • electron/packager • Bundling Application...", icon warnings, etc.) —
// previously discarded entirely, which is why a silent packager skip gave
// zero clue as to why.
function run(scriptPath, args, cwd, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(VENDORED_NODE_BINARY, [scriptPath, ...args], {
      cwd,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      stdio: "pipe",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      const output = `${stdout}${stderr}`.slice(-4000);
      if (code === 0) resolve(output);
      else reject(new Error(`"quasar ${args.join(" ")}" a échoué (code ${code})\n${output}`));
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

  // Checked here, not in shellAssembly.js's shared assembleShell() —
  // webPreview.js (the other caller) never invokes electron-packager, so
  // it has no use for this and shouldn't be blocked by its absence.
  if (!fs.existsSync(VENDORED_ELECTRON_CACHE)) {
    throw new Error(
      "Cache Electron introuvable (templates/game-shell/electron-cache). " +
        "Lance `pnpm run vendor:game-shell` à la racine de storie-engine avant de packager.",
    );
  }

  const tmpDir = path.join(os.tmpdir(), `storie-engine-build-${Date.now()}`);
  try {
    await assembleShell(tmpDir, rootPath);
    const buildOutput = await run(resolveQuasarCli(tmpDir), ["build", "-m", "electron"], tmpDir, {
      STORIE_ELECTRON_CACHE: VENDORED_ELECTRON_CACHE,
      // See VENDORED_NPM_DIR's own comment — makes plain `npm` resolve for
      // the electron-builder step's own package-manager detection without
      // requiring pnpm/yarn/npm/bun on the end user's machine.
      PATH: `${VENDORED_NPM_DIR}${path.delimiter}${process.env.PATH}`,
    });

    const packagedDir = path.join(tmpDir, "dist", "electron", "Packaged");
    if (!fs.existsSync(packagedDir)) {
      throw new Error(
        "Le build a réussi mais le dossier packagé est introuvable (dist/electron/Packaged).\n" + buildOutput,
      );
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

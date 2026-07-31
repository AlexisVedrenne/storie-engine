// Serves the currently open project as a real webpage on the local network
// — same temp-shell assembly as build.js's "export game" (see
// shellAssembly.js), but `quasar dev --host` instead of `quasar build`: a
// long-running dev server instead of a one-shot export, so a phone on the
// same Wi-Fi can open it in a real mobile browser (far more honest test of
// the touch UI than the desktop Electron window). Only one preview ever
// runs at a time — starting a new one implicitly stops whatever was
// already running; the renderer's blocking dialog (WebPreviewDialog.vue)
// is the only UI for this, closing it always stops the server.
import { ipcMain } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { assembleShell } from "./shellAssembly.js";

const PORT = 9200; // distinct from the editor's own dev port (9000) so `pnpm dev` on storie-engine itself never collides with a preview it starts

// One `session` object per start->stop cycle, tracked here so stop can find
// and kill it — `child` gets reassigned as the session moves from "pnpm
// install" to "quasar dev" (whichever process is currently running), and
// `aborted` lets a stop requested mid-install (before there's a `child` to
// kill yet, or between two awaited steps) still cancel the steps still to
// come instead of quietly finishing and leaving an orphaned dev server
// nothing in the UI still points at.
let current = null;

// First non-internal IPv4 — what a phone on the same Wi-Fi actually needs
// to type in, not 0.0.0.0 (that's a bind address, meaningless to a client).
function findLanAddress() {
  for (const ifaceList of Object.values(os.networkInterfaces())) {
    for (const iface of ifaceList || []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

// Polls the dev server instead of scraping its stdout for a "ready" line —
// quasar/vite's exact wording isn't a stable contract to depend on, a real
// TCP response is.
function waitForServer(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get({ host: "127.0.0.1", port, timeout: 1500 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("Le serveur de preview n'a pas démarré à temps."));
        else setTimeout(attempt, 400);
      });
      req.on("timeout", () => req.destroy());
    }
    attempt();
  });
}

async function stopSession(session) {
  session.aborted = true;
  if (session.child) {
    try {
      session.child.kill();
    } catch {
      // already dead — fine
    }
  }
  // Best-effort, same non-fatal tolerance as build.js's cleanupWithRetry —
  // a leftover temp dir is harmless, unlike masking that stop worked.
  try {
    fs.rmSync(session.tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function stopCurrent() {
  if (!current) return;
  const session = current;
  current = null;
  await stopSession(session);
}

export function registerWebPreviewHandlers() {
  ipcMain.handle("project:startWebPreview", async (_evt, { rootPath }) => {
    await stopCurrent();

    const address = findLanAddress();
    if (!address) {
      throw new Error("Aucune interface réseau locale trouvée — vérifie ta connexion Wi-Fi.");
    }

    const tmpDir = path.join(os.tmpdir(), `storie-engine-preview-${Date.now()}`);
    const session = { child: null, tmpDir, aborted: false };
    current = session;

    await assembleShell(tmpDir, rootPath);
    if (session.aborted) throw new Error("Preview annulée.");

    const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    await new Promise((resolve, reject) => {
      const install = spawn(pnpmCmd, ["install"], { cwd: tmpDir, shell: true, stdio: "pipe" });
      session.child = install;
      let stderr = "";
      install.stderr.on("data", (d) => (stderr += d.toString()));
      install.on("error", reject);
      install.on("close", (code) => {
        session.child = null;
        if (code === 0) resolve();
        else reject(new Error(`"pnpm install" a échoué\n${stderr.slice(-4000)}`));
      });
    });
    if (session.aborted) throw new Error("Preview annulée.");

    const devChild = spawn(pnpmCmd, ["exec", "quasar", "dev", "--hostname", "0.0.0.0", "--port", String(PORT)], {
      cwd: tmpDir,
      shell: true,
      stdio: "pipe",
    });
    session.child = devChild;
    devChild.on("exit", () => {
      if (current === session) current = null;
    });

    try {
      await waitForServer(PORT, 60000);
    } catch (err) {
      await stopSession(session);
      if (current === session) current = null;
      throw err;
    }
    if (session.aborted) throw new Error("Preview annulée.");

    return { url: `http://${address}:${PORT}` };
  });

  ipcMain.handle("project:stopWebPreview", async () => {
    await stopCurrent();
    return true;
  });
}

// Called from electron-main.js's own 'before-quit' — closing the editor
// while a preview is running (at ANY stage: still installing, or already
// serving) must not leave an orphaned process (and its bound port) behind.
export function stopWebPreviewOnQuit() {
  return stopCurrent();
}

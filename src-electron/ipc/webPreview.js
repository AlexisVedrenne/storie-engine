// Serves the currently open project as a real webpage on the local network
// — same temp-shell assembly as build.js's "export game" (see
// shellAssembly.js), but `quasar dev --hostname` instead of `quasar build`:
// a long-running dev server instead of a one-shot export, so a phone on
// the same Wi-Fi can open it in a real mobile browser (far more honest
// test of the touch UI than the desktop Electron window). Only one preview
// ever runs at a time — starting a new one implicitly stops whatever was
// already running; the renderer's blocking dialog (WebPreviewDialog.vue)
// is the only UI for this, closing it always stops the server. Like
// build.js, this runs quasar's CLI through this app's OWN Electron binary
// in Node mode (see build.js's run() comment) against the vendored+
// junctioned node_modules — no pnpm/Node.js/internet needed on the user's
// machine.
import { ipcMain } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { assembleShell, resolveQuasarCli } from "./shellAssembly.js";

const PREFERRED_PORT = 9200; // distinct from the editor's own dev port (9000) so `pnpm dev` on storie-engine itself never collides with a preview it starts — just a preference: `--port` doesn't stop Vite silently picking another one if this is already taken (see URL parsing below, which is why that's no longer a problem)

// One `session` object per start->stop cycle, tracked here so stop can find
// and kill it — `aborted` lets a stop requested mid-assembly (before
// there's a `child` to kill yet) still cancel the steps still to come
// instead of quietly finishing and leaving an orphaned dev server nothing
// in the UI still points at.
let current = null;

// Reads the dev server's OWN printed URL rather than assuming
// PREFERRED_PORT was actually used, or guessing the LAN address ourselves
// via os.networkInterfaces() — confirmed by real testing that Vite (which
// quasar dev wraps) silently falls back to a DIFFERENT port when the
// requested one is already taken (e.g. a leftover preview session from
// before this app's own process-lifecycle bugs got fixed), which used to
// make this poll a port nothing was actually listening on, forever, until
// timeout. Quasar always prints every reachable URL (localhost + every
// LAN interface) once truly ready — parsing that is both more honest
// (it's what actually happened) and simpler than re-deriving it.
const URL_RE = /https?:\/\/((?:\d{1,3}\.){3}\d{1,3}):(\d+)\//g;

function isPrivateLan(ip) {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
}

// Prefers a real private-LAN address (what a phone on the same Wi-Fi can
// actually reach) over a 169.254.x.x link-local one (an unconfigured/
// isolated adapter — Node's os.networkInterfaces() doesn't flag those as
// "internal" even though they're useless to a phone), and over both is
// still better than nothing if that's all that got printed.
function extractBestUrl(text) {
  let lan = null;
  let any = null;
  for (const [full, ip] of text.matchAll(URL_RE)) {
    if (ip === "127.0.0.1") continue;
    if (isPrivateLan(ip)) {
      lan = full;
      break;
    }
    if (!any) any = full;
  }
  return lan || any || null;
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

// One last confirm GET against the URL Vite itself printed — belt and
// suspenders. In every real test so far the printed line already meant
// "actually serving", but this catches the edge case of a crash landing in
// the handful of ms between printing it and us returning it to the dialog.
function confirmReachable(url, timeoutMs) {
  const { hostname, port } = new URL(url);
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get({ host: hostname, port, timeout: 1500 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("Le serveur de preview s'est arrêté juste après son démarrage."));
        else setTimeout(attempt, 300);
      });
      req.on("timeout", () => req.destroy());
    }
    attempt();
  });
}

export function registerWebPreviewHandlers() {
  ipcMain.handle("project:startWebPreview", async (_evt, { rootPath }) => {
    await stopCurrent();

    const tmpDir = path.join(os.tmpdir(), `storie-engine-preview-${Date.now()}`);
    const session = { child: null, tmpDir, aborted: false };
    current = session;

    await assembleShell(tmpDir, rootPath);
    if (session.aborted) throw new Error("Preview annulée.");

    const devChild = spawn(
      process.execPath,
      [resolveQuasarCli(tmpDir), "dev", "--hostname", "0.0.0.0", "--port", String(PREFERRED_PORT)],
      { cwd: tmpDir, env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, stdio: "pipe" },
    );
    session.child = devChild;

    // Rolling tail of everything the dev server has printed — both what
    // extractBestUrl() reads readiness from, and what gets attached to
    // whichever error surfaces below (timeout OR early exit) so a failure
    // is actually diagnosable instead of a bare "didn't start in time".
    let output = "";
    devChild.stdout.on("data", (d) => (output += d.toString()));
    devChild.stderr.on("data", (d) => (output += d.toString()));
    const outputTail = () => output.slice(-3000);

    devChild.on("exit", () => {
      if (current === session) current = null;
    });

    // A first-ever run against a freshly-junctioned node_modules can be
    // genuinely slow (Vite's dependency pre-bundling step, not something
    // repeat runs pay again — that cache lives inside the vendored
    // node_modules itself, shared across sessions) — kept generous.
    const DEADLINE_MS = 120000;
    const deadline = Date.now() + DEADLINE_MS;

    function waitForUrl() {
      return new Promise((resolve, reject) => {
        function check() {
          const url = extractBestUrl(output);
          if (url) {
            resolve(url);
            return;
          }
          if (Date.now() > deadline) {
            reject(
              new Error(`Le serveur de preview n'a pas démarré à temps.\n\nSortie du serveur :\n${outputTail()}`),
            );
            return;
          }
          setTimeout(check, 300);
        }
        check();
      });
    }

    let url;
    try {
      // Raced against the child's own exit — ANY exit while still waiting
      // to become ready is a failure worth reporting immediately, rather
      // than silently waiting out the rest of the deadline for a process
      // that's already gone.
      url = await Promise.race([
        waitForUrl(),
        new Promise((_resolve, reject) => {
          devChild.once("exit", (code) => {
            reject(new Error(`Le serveur de preview s'est arrêté (code ${code}).\n\nSortie :\n${outputTail()}`));
          });
        }),
      ]);
      await confirmReachable(url, 10000);
    } catch (err) {
      await stopSession(session);
      if (current === session) current = null;
      throw err;
    }
    if (session.aborted) throw new Error("Preview annulée.");

    return { url };
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

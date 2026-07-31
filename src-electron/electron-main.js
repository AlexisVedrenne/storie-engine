import { app, BrowserWindow, Menu, protocol, session, net } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from '#q-app/electron/main'
import { registerAllHandlers } from './ipc/index.js'
import { getCurrentAssetsRoot } from './ipc/project.js'
import { stopWebPreviewOnQuit } from './ipc/webPreview.js'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

// Must run before app.whenReady() — registering a privileged scheme any
// later is silently ignored by Electron (the protocol would work but
// without fetch/CSP support), see docs/editor-plan-phase1.md risk #4.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'storie-asset',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

async function createWindow () {
  /**
   * Initial window options
   */
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath('icons/icon.png'), // linux
    width: 1000,
    height: 600,
    useContentSize: true,
    show: false, // maximized (see 'ready-to-show' below) before it's ever shown, no visible resize-then-jump
    webPreferences: {
      contextIsolation: true,
      // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.join(import.meta.dirname, 'electron-preload.cjs')
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  // app.isPackaged is Electron's own runtime signal (true for a real
  // packaged .exe, false for `quasar dev`/`quasar build --skip-pkg`) —
  // checked instead of relying only on the build tool's compile-time
  // QUASAR_DEBUG constant, so devtools stay closed in a packaged build no
  // matter how they'd otherwise get triggered.
  if (!app.isPackaged && import.meta.env.QUASAR_DEBUG) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  return mainWindow
}

void app.whenReady().then(async () => {
  registerQuasarRuntime()

  // No File/Edit/View/Window menu bar — this is an editor with its own
  // topbar/toolbar, Electron's default template menu (and the "Toggle
  // Developer Tools" item it carries) is just unused chrome sitting on
  // top of it, not a real command surface for this app.
  Menu.setApplicationMenu(null)

  // Serves the currently-open project's assets/ folder to the renderer
  // (resolveAssetUrl() in src/engine/assets.js builds `storie-asset://...`
  // URLs) — safer than a raw file:// binding and CSP-compatible.
  session.defaultSession.protocol.handle('storie-asset', (request) => {
    const relPath = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    const assetsRoot = getCurrentAssetsRoot()
    if (!assetsRoot) return new Response('no project loaded', { status: 404 })
    const abs = path.join(assetsRoot, relPath)
    if (!abs.startsWith(assetsRoot)) return new Response('forbidden', { status: 403 })
    return net.fetch(pathToFileURL(abs).href)
  })

  const mainWindow = await createWindow()
  registerAllHandlers(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

// Closing the editor while a web preview is running must not leave an
// orphaned dev server (and its bound port) behind — WebPreviewDialog.vue's
// own Stop button covers the normal case, this covers quitting without it.
app.on('before-quit', () => {
  stopWebPreviewOnQuit()
})

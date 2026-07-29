import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { registerQuasarRuntime, resolveElectronAssetsPath } from '#q-app/electron/main'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

// app.getPath('userData') is keyed by productName, not by install location —
// C:\Users\<user>\AppData\Roaming\<Product Name>\ on Windows (the
// Roaming/local-per-game folder asked for) — so the save survives a game
// update/reinstall as long as productName doesn't change, unlike anything
// stored next to the .exe itself (overwritten on every reinstall).
function saveFilePath() {
  return path.join(app.getPath('userData'), 'save.json')
}

// Synchronous on purpose — story.js's load()/init() run synchronously before
// PhoneShell ever mounts (see GamePage.vue), same as everywhere else in this
// engine already assumes. ipcRenderer.sendSync blocks the renderer for this
// one small local read at startup, which is the whole point.
function registerSaveHandlers() {
  ipcMain.on('game-save:load', (event) => {
    try {
      event.returnValue = JSON.parse(fs.readFileSync(saveFilePath(), 'utf-8'))
    } catch {
      event.returnValue = null
    }
  })

  ipcMain.on('game-save:write', (_event, data) => {
    try {
      fs.mkdirSync(app.getPath('userData'), { recursive: true })
      fs.writeFileSync(saveFilePath(), JSON.stringify(data), 'utf-8')
    } catch (err) {
      console.error('[storie-game] failed to write save:', err)
    }
  })
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath('icons/icon.png'), // linux
    width: 1000,
    height: 800,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'electron-preload.cjs')
    }
  })

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (import.meta.env.QUASAR_DEBUG) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  return mainWindow
}

void app.whenReady().then(async () => {
  if (!import.meta.env.QUASAR_DEV) {
    const { Menu } = await import('electron')
    Menu.setApplicationMenu(null)
  }

  registerSaveHandlers()
  await registerQuasarRuntime()
  await createWindow()

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

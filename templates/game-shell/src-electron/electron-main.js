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
function savesFilePath() {
  return path.join(app.getPath('userData'), 'saves.json')
}

// Pre-multi-slot save format — a single flat snapshot, no slot wrapper.
// Only ever READ once, by the migration below; never written again.
function legacySaveFilePath() {
  return path.join(app.getPath('userData'), 'save.json')
}

const SLOT_IDS = ['slot1', 'slot2', 'slot3']

// Reads saves.json, migrating a pre-multi-slot save.json into slot1 the
// first time it's found — idempotent (checked on every call, no marker
// file): once saves.json exists this short-circuits on the first stat, so
// in practice the migration branch only ever really runs once per machine,
// and self-heals if saves.json is ever deleted by hand. A corrupt legacy
// file degrades to "no migration, start with 3 empty slots" rather than
// crashing the load handler, same discipline as the try/catch below.
function readSavesFile() {
  if (fs.existsSync(savesFilePath())) {
    try {
      return JSON.parse(fs.readFileSync(savesFilePath(), 'utf-8'))
    } catch {
      return { slot1: null, slot2: null, slot3: null }
    }
  }
  if (fs.existsSync(legacySaveFilePath())) {
    let legacy = null
    try {
      legacy = JSON.parse(fs.readFileSync(legacySaveFilePath(), 'utf-8'))
    } catch {
      legacy = null
    }
    const migrated = { slot1: legacy, slot2: null, slot3: null }
    writeSavesFile(migrated) // old save.json itself is left in place, untouched, just inert from here on
    return migrated
  }
  return { slot1: null, slot2: null, slot3: null }
}

function writeSavesFile(bundle) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  fs.writeFileSync(savesFilePath(), JSON.stringify(bundle), 'utf-8')
}

// Synchronous on purpose — story.js's loadSlotsSummary() runs synchronously
// before PhoneShell ever mounts (see GamePage.vue), same as everywhere else
// in this engine already assumes. ipcRenderer.sendSync blocks the renderer
// for this one small local read at startup, which is the whole point.
function registerSaveHandlers() {
  ipcMain.on('game-save:loadAll', (event) => {
    event.returnValue = readSavesFile()
  })

  ipcMain.on('game-save:write', (_event, { slotId, data }) => {
    try {
      if (!SLOT_IDS.includes(slotId)) return
      const bundle = readSavesFile()
      bundle[slotId] = data
      writeSavesFile(bundle)
    } catch (err) {
      console.error('[storie-game] failed to write save:', err)
    }
  })

  ipcMain.on('game-save:deleteSlot', (_event, { slotId }) => {
    try {
      if (!SLOT_IDS.includes(slotId)) return
      const bundle = readSavesFile()
      bundle[slotId] = null
      writeSavesFile(bundle)
    } catch (err) {
      console.error('[storie-game] failed to delete save slot:', err)
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

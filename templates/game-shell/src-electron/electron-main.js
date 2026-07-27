import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { registerQuasarRuntime, resolveElectronAssetsPath } from '#q-app/electron/main'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

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

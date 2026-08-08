// IPC surface for the Android export toolchain (see androidToolchain.js for
// the actual download/install mechanics — this file just resolves the real
// on-disk root via Electron's `app` and wires progress events to the
// renderer).
import { app, ipcMain } from 'electron'
import path from 'node:path'
import { detectJdk, detectSdk, installToolchain } from './androidToolchain.js'

// Persistent (not a temp dir) — survives app updates/restarts so the
// ~700MB download only ever happens once per machine, same as Android
// Studio's own SDK Manager. Exported for build.js's own Android target,
// which needs the same concrete path to point JAVA_HOME/ANDROID_HOME at.
export function getToolchainRoot() {
  return path.join(app.getPath('userData'), 'android-toolchain')
}

export function registerAndroidHandlers(mainWindow) {
  ipcMain.handle('android:checkToolchain', async () => {
    const toolchainRoot = getToolchainRoot()
    return { jdkOk: detectJdk(toolchainRoot), sdkOk: detectSdk(toolchainRoot) }
  })

  ipcMain.handle('android:installToolchain', async () => {
    const toolchainRoot = getToolchainRoot()
    await installToolchain(toolchainRoot, (progress) => {
      mainWindow.webContents.send('android:installProgress', progress)
    })
    return { jdkOk: detectJdk(toolchainRoot), sdkOk: detectSdk(toolchainRoot) }
  })
}

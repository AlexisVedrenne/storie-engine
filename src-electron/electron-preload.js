/**
 * This file is used specifically for security reasons.
 * Here you can securely expose privileged APIs into the renderer process
 * by leveraging Electron's contextBridge functionality and communicating
 * with the main process through Electron's inter-process communication (IPC).
 *
 * WARNING!
 * The preload script sandboxing offers limited access to a full Node.js environment.
 * Do NOT attempt to import packages from node_modules or use Node.js APIs directly in this file.
 * Instead, use IPC to communicate with the main process and access packages and Node.js
 * functionality there.
 *
 * Example on injecting window.myAPI.doAThing() into renderer thread:
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * Preload script documentation:
 * https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
 */

import { contextBridge, ipcRenderer } from 'electron'
import { quasarRuntime } from '#q-app/electron/preload'

/**
 * Can be used in the renderer process through `window.quasarRuntime`
 */
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime)

/**
 * Project I/O for the editor — see src-electron/ipc/project.js and
 * docs/editor-plan-phase1.md + docs/phase2-plan.md. Used from
 * window.storieAPI in the renderer.
 */
contextBridge.exposeInMainWorld('storieAPI', {
  selectProjectFolder: () => ipcRenderer.invoke('project:selectFolder'),
  selectNewProjectLocation: () => ipcRenderer.invoke('project:selectNewProjectLocation'),
  reserveNewFolder: (payload) => ipcRenderer.invoke('project:reserveNewFolder', payload),
  createProject: (payload) => ipcRenderer.invoke('project:createProject', payload),
  loadProject: (rootPath) => ipcRenderer.invoke('project:load', rootPath),
  saveManifest: (payload) => ipcRenderer.invoke('project:saveManifest', payload),
  saveChapter: (payload) => ipcRenderer.invoke('project:saveChapter', payload),
  createChapter: (payload) => ipcRenderer.invoke('project:createChapter', payload),
  renameChapter: (payload) => ipcRenderer.invoke('project:renameChapter', payload),
  deleteChapter: (payload) => ipcRenderer.invoke('project:deleteChapter', payload),
  saveContacts: (payload) => ipcRenderer.invoke('project:saveContacts', payload),
  saveThreads: (payload) => ipcRenderer.invoke('project:saveThreads', payload),
  saveGame: (payload) => ipcRenderer.invoke('project:saveGame', payload),
  saveI18nBucket: (payload) => ipcRenderer.invoke('project:saveI18nBucket', payload),
  saveSeedBucket: (payload) => ipcRenderer.invoke('project:saveSeedBucket', payload),
  createLocale: (payload) => ipcRenderer.invoke('project:createLocale', payload),
  deleteLocale: (payload) => ipcRenderer.invoke('project:deleteLocale', payload),
  getSystemLocale: () => ipcRenderer.invoke('app:getSystemLocale'),
  pickAsset: (payload) => ipcRenderer.invoke('project:pickAsset', payload),
  importAsset: (payload) => ipcRenderer.invoke('project:importAsset', payload),
  listAssetFiles: (payload) => ipcRenderer.invoke('project:listAssetFiles', payload),
  createAssetFolder: (payload) => ipcRenderer.invoke('project:createAssetFolder', payload),
  deleteAsset: (payload) => ipcRenderer.invoke('project:deleteAsset', payload),
  checkAssets: (payload) => ipcRenderer.invoke('project:checkAssets', payload),
  saveCustomApp: (payload) => ipcRenderer.invoke('project:saveCustomApp', payload),
  createCustomApp: (payload) => ipcRenderer.invoke('project:createCustomApp', payload),
  deleteCustomApp: (payload) => ipcRenderer.invoke('project:deleteCustomApp', payload),
  exportCustomApp: (payload) => ipcRenderer.invoke('project:exportCustomApp', payload),
  importCustomApp: (payload) => ipcRenderer.invoke('project:importCustomApp', payload),
  exportTheme: (payload) => ipcRenderer.invoke('project:exportTheme', payload),
  importTheme: () => ipcRenderer.invoke('project:importTheme'),
  buildAll: (payload) => ipcRenderer.invoke('project:buildAll', payload),
  startWebPreview: (payload) => ipcRenderer.invoke('project:startWebPreview', payload),
  stopWebPreview: () => ipcRenderer.invoke('project:stopWebPreview'),
  checkAndroidToolchain: () => ipcRenderer.invoke('android:checkToolchain'),
  installAndroidToolchain: () => ipcRenderer.invoke('android:installToolchain'),
  // Streamed progress, not a one-shot invoke — both per-distribution build
  // status (BuildStepper.vue's step 3) and the Android toolchain
  // download/extract/license/package steps (step 2). Each returns an
  // unsubscribe function.
  onBuildProgress: (callback) => {
    const handler = (_evt, progress) => callback(progress)
    ipcRenderer.on('project:buildProgress', handler)
    return () => ipcRenderer.removeListener('project:buildProgress', handler)
  },
  onAndroidInstallProgress: (callback) => {
    const handler = (_evt, progress) => callback(progress)
    ipcRenderer.on('android:installProgress', handler)
    return () => ipcRenderer.removeListener('android:installProgress', handler)
  },
  // Cloud sync (see src-electron/ipc/cloudSync.js + docs/cloud-sync-rclone-plan.md).
  cloud: {
    checkRclone: () => ipcRenderer.invoke('cloud:checkRclone'),
    installRclone: () => ipcRenderer.invoke('cloud:installRclone'),
    listProviders: () => ipcRenderer.invoke('cloud:listProviders'),
    listRemotes: () => ipcRenderer.invoke('cloud:listRemotes'),
    listRemoteProjects: (payload) => ipcRenderer.invoke('cloud:listRemoteProjects', payload),
    connectProvider: (payload) => ipcRenderer.invoke('cloud:connectProvider', payload),
    disconnectRemote: (payload) => ipcRenderer.invoke('cloud:disconnectRemote', payload),
    purgePath: (payload) => ipcRenderer.invoke('cloud:purgePath', payload),
    readSyncState: (payload) => ipcRenderer.invoke('cloud:readSyncState', payload),
    push: (payload) => ipcRenderer.invoke('cloud:push', payload),
    pull: (payload) => ipcRenderer.invoke('cloud:pull', payload),
    jobStatus: (payload) => ipcRenderer.invoke('cloud:jobStatus', payload),
    onInstallProgress: (callback) => {
      const handler = (_evt, progress) => callback(progress)
      ipcRenderer.on('cloud:installProgress', handler)
      return () => ipcRenderer.removeListener('cloud:installProgress', handler)
    },
  },
})

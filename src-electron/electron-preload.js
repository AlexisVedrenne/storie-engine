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
contextBridge.exposeInMainWorld("quasarRuntime", quasarRuntime)

/**
 * Project I/O for the editor — see src-electron/ipc/project.js and
 * docs/editor-plan-phase1.md + docs/phase2-plan.md. Used from
 * window.storieAPI in the renderer.
 */
contextBridge.exposeInMainWorld("storieAPI", {
  selectProjectFolder: () => ipcRenderer.invoke("project:selectFolder"),
  selectNewProjectLocation: () => ipcRenderer.invoke("project:selectNewProjectLocation"),
  createProject: (payload) => ipcRenderer.invoke("project:createProject", payload),
  loadProject: (rootPath) => ipcRenderer.invoke("project:load", rootPath),
  saveChapter: (payload) => ipcRenderer.invoke("project:saveChapter", payload),
  createChapter: (payload) => ipcRenderer.invoke("project:createChapter", payload),
  deleteChapter: (payload) => ipcRenderer.invoke("project:deleteChapter", payload),
  saveContacts: (payload) => ipcRenderer.invoke("project:saveContacts", payload),
  saveThreads: (payload) => ipcRenderer.invoke("project:saveThreads", payload),
  saveGame: (payload) => ipcRenderer.invoke("project:saveGame", payload),
  saveI18nBucket: (payload) => ipcRenderer.invoke("project:saveI18nBucket", payload),
  saveSeedBucket: (payload) => ipcRenderer.invoke("project:saveSeedBucket", payload),
  createLocale: (payload) => ipcRenderer.invoke("project:createLocale", payload),
  deleteLocale: (payload) => ipcRenderer.invoke("project:deleteLocale", payload),
  getSystemLocale: () => ipcRenderer.invoke("app:getSystemLocale"),
  pickAsset: (payload) => ipcRenderer.invoke("project:pickAsset", payload),
  importAsset: (payload) => ipcRenderer.invoke("project:importAsset", payload),
  listAssetFiles: (payload) => ipcRenderer.invoke("project:listAssetFiles", payload),
  createAssetFolder: (payload) => ipcRenderer.invoke("project:createAssetFolder", payload),
  deleteAsset: (payload) => ipcRenderer.invoke("project:deleteAsset", payload),
  checkAssets: (payload) => ipcRenderer.invoke("project:checkAssets", payload),
  saveCustomApp: (payload) => ipcRenderer.invoke("project:saveCustomApp", payload),
  createCustomApp: (payload) => ipcRenderer.invoke("project:createCustomApp", payload),
  deleteCustomApp: (payload) => ipcRenderer.invoke("project:deleteCustomApp", payload),
  exportCustomApp: (payload) => ipcRenderer.invoke("project:exportCustomApp", payload),
  importCustomApp: (payload) => ipcRenderer.invoke("project:importCustomApp", payload),
  buildGame: (payload) => ipcRenderer.invoke("project:build", payload),
  startWebPreview: (payload) => ipcRenderer.invoke("project:startWebPreview", payload),
  stopWebPreview: () => ipcRenderer.invoke("project:stopWebPreview")
})

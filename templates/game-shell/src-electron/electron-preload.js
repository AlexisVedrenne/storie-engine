import { contextBridge, ipcRenderer } from 'electron'
import { quasarRuntime } from '#q-app/electron/preload'

// No project-editing IPC here — this is a shipped game, all its content is
// bundled statically at build time (see ../src/pages/GamePage.vue). The one
// exception is the local save file (see ../src-electron/electron-main.js) —
// story.js's load() needs it synchronously, before PhoneShell ever mounts,
// so `load` is a blocking sendSync round-trip rather than the usual async
// invoke; `write` doesn't need a reply so a plain one-way send is enough.
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime)
contextBridge.exposeInMainWorld('storieGameSave', {
  load: () => ipcRenderer.sendSync('game-save:load'),
  write: (data) => ipcRenderer.send('game-save:write', data)
})

import { contextBridge, ipcRenderer } from 'electron'
import { quasarRuntime } from '#q-app/electron/preload'

// No project-editing IPC here — this is a shipped game, all its content is
// bundled statically at build time (see ../src/pages/GamePage.vue). The one
// exception is the local save file (see ../src-electron/electron-main.js) —
// story.js's loadSlotsSummary() needs it synchronously, before PhoneShell
// ever mounts, so `loadAll` is a blocking sendSync round-trip rather than
// the usual async invoke; `write`/`deleteSlot` don't need a reply so a
// plain one-way send is enough. 3 fixed slots (see electron-main.js's
// SLOT_IDS) — `write`/`deleteSlot` both take the slot id explicitly.
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime)
contextBridge.exposeInMainWorld('storieGameSave', {
  loadAll: () => ipcRenderer.sendSync('game-save:loadAll'),
  write: (slotId, data) => ipcRenderer.send('game-save:write', { slotId, data }),
  deleteSlot: (slotId) => ipcRenderer.send('game-save:deleteSlot', { slotId })
})

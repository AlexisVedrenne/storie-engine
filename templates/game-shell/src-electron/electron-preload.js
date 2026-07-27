import { contextBridge } from 'electron'
import { quasarRuntime } from '#q-app/electron/preload'

// No project-editing IPC here — this is a shipped game, all its content is
// bundled statically at build time (see ../src/pages/GamePage.vue). Nothing
// the renderer needs from the main process beyond Quasar's own runtime.
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime)

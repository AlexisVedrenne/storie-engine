import { registerProjectHandlers } from './project.js'
import { registerBuildHandlers } from './build.js'
import { registerAppHandlers } from './app.js'
import { registerWebPreviewHandlers } from './webPreview.js'
import { registerCustomAppHandlers } from './customApps.js'
import { registerAndroidHandlers } from './android.js'
import { registerCloudSyncHandlers } from './cloudSync.js'

export function registerAllHandlers(mainWindow) {
  registerProjectHandlers(mainWindow)
  registerBuildHandlers(mainWindow)
  registerAppHandlers()
  registerWebPreviewHandlers()
  registerCustomAppHandlers(mainWindow)
  registerAndroidHandlers(mainWindow)
  registerCloudSyncHandlers(mainWindow)
}

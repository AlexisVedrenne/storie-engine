import { registerProjectHandlers } from "./project.js";
import { registerBuildHandlers } from "./build.js";
import { registerAppHandlers } from "./app.js";
import { registerWebPreviewHandlers } from "./webPreview.js";
import { registerCustomAppHandlers } from "./customApps.js";

export function registerAllHandlers(mainWindow) {
  registerProjectHandlers(mainWindow);
  registerBuildHandlers(mainWindow);
  registerAppHandlers();
  registerWebPreviewHandlers();
  registerCustomAppHandlers(mainWindow);
}

import { registerProjectHandlers } from "./project.js";
import { registerBuildHandlers } from "./build.js";
import { registerAppHandlers } from "./app.js";

export function registerAllHandlers(mainWindow) {
  registerProjectHandlers(mainWindow);
  registerBuildHandlers(mainWindow);
  registerAppHandlers();
}

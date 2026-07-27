import { registerProjectHandlers } from "./project.js";
import { registerBuildHandlers } from "./build.js";

export function registerAllHandlers(mainWindow) {
  registerProjectHandlers(mainWindow);
  registerBuildHandlers(mainWindow);
}

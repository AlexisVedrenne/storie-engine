import { registerProjectHandlers } from "./project.js";

export function registerAllHandlers(mainWindow) {
  registerProjectHandlers(mainWindow);
}

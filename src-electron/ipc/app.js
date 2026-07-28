// App/OS-level handlers, not project-scoped (see project.js/build.js for
// those) — currently just exposes the host OS's UI language so the
// renderer can guess which language the author is likely writing chapters
// in (see LocaleList.vue's "Nouvelle langue" filter).
import { app, ipcMain } from "electron";

export function registerAppHandlers() {
  ipcMain.handle("app:getSystemLocale", () => app.getLocale());
}

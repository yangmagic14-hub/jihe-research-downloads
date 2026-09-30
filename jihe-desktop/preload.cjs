const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("jihe", {
  platform: process.platform,
  openSource: (profileId) => ipcRenderer.invoke("source:open", profileId),
  inspectSafari: (profileId) => ipcRenderer.invoke("safari:inspect", profileId),
  start: (options) => ipcRenderer.invoke("run:start", options),
  continue: () => ipcRenderer.invoke("run:continue"),
  pause: () => ipcRenderer.invoke("run:pause"),
  load: () => ipcRenderer.invoke("state:load"),
  export: (format) => ipcRenderer.invoke("export:records", format),
  onUpdate: (handler) => ipcRenderer.on("run:update", (_event, state) => handler(state)),
  onLog: (handler) => ipcRenderer.on("run:log", (_event, line) => handler(line))
});

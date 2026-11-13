const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bw", {
  fullscreen: () => ipcRenderer.send("fullscreen"),
  quit: () => ipcRenderer.send("quit"),
  getSettings: () => ipcRenderer.invoke("settings-get"),
  setSettings: (patch) => ipcRenderer.invoke("settings-set", patch),
  onAskQuit: (cb) => ipcRenderer.on("ask-quit", () => cb()),
  quitPromptShown: () => ipcRenderer.send("quit-prompt-shown"),
  onSettings: (cb) => ipcRenderer.on("settings-changed", (e, s) => cb(s)),
  onUpdate: (ev, cb) => ipcRenderer.on(ev, (e, d) => cb(d)),
  updateCheck: () => ipcRenderer.send("update-check"),
  updateGo: () => ipcRenderer.send("update-go"),
  version: "2.5.0",
});

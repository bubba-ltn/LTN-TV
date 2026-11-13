const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bw", {
  fullscreen: () => ipcRenderer.send("fullscreen"),
  quit: () => ipcRenderer.send("quit"),
  getSettings: () => ipcRenderer.invoke("settings-get"),
  setSettings: (patch) => ipcRenderer.invoke("settings-set", patch),
  onAskQuit: (cb) => ipcRenderer.on("ask-quit", () => cb()),
  quitPromptShown: () => ipcRenderer.send("quit-prompt-shown"),
  onSettings: (cb) => ipcRenderer.on("settings-changed", (e, s) => cb(s)),
  version: "2.4.1",
});

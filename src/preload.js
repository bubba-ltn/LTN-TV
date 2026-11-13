const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bw", {
  fullscreen: () => ipcRenderer.send("fullscreen"),
  quit: () => ipcRenderer.send("quit"),
  version: "1.0",
});

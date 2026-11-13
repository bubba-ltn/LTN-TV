const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bw", {
  fullscreen: () => ipcRenderer.send("fullscreen"),
  quit: () => ipcRenderer.send("quit"),
  ndiToggle: () => ipcRenderer.invoke("ndi-toggle"),
  ndiAudio: (data, sampleRate, samples) => ipcRenderer.send("ndi-audio", { data, sampleRate, samples }),
  version: "1.0",
});

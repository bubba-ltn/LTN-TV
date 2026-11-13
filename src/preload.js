const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bw", {
  fullscreen: () => ipcRenderer.send("fullscreen"),
  quit: () => ipcRenderer.send("quit"),
  ndiToggle: () => ipcRenderer.invoke("ndi-toggle"),
  ndiAudio: (data, sampleRate, samples) => ipcRenderer.send("ndi-audio", { data, sampleRate, samples }),
  ndiState: (state) => ipcRenderer.send("ndi-state", state),
  ndiReady: () => ipcRenderer.send("ndi-ready"),
  onNdiSync: (cb) => ipcRenderer.on("ndi-sync", (e, state) => cb(state)),
  onNdiResend: (cb) => ipcRenderer.on("ndi-resend", () => cb()),
  version: "1.0",
});

const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bw", {
  fullscreen: () => ipcRenderer.send("fullscreen"),
  quit: () => ipcRenderer.send("quit"),
  getSettings: () => ipcRenderer.invoke("settings-get"),
  setSettings: (patch) => ipcRenderer.invoke("settings-set", patch),
  onSettings: (cb) => ipcRenderer.on("settings-changed", (e, s) => cb(s)),
  ndiToggle: () => ipcRenderer.invoke("ndi-toggle"),
  onNdiStatus: (cb) => ipcRenderer.on("ndi-status", (e, r) => cb(r)),
  ndiAudio: (data, sampleRate, samples) => ipcRenderer.send("ndi-audio", { data, sampleRate, samples }),
  ndiState: (state) => ipcRenderer.send("ndi-state", state),
  ndiReady: () => ipcRenderer.send("ndi-ready"),
  onNdiSync: (cb) => ipcRenderer.on("ndi-sync", (e, state) => cb(state)),
  onNdiResend: (cb) => ipcRenderer.on("ndi-resend", () => cb()),
  version: "2.3.0",
});

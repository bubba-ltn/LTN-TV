// BackWhenTV for Windows: a window around the player page in renderer/, plus settings, a tray icon and an NDI output.
// Keyboard and mouse only. The one job the shell does that a browser can't: Pluto's streams only answer app-like requests and send no CORS
// headers, so for those hosts we send the same user agent the Android app uses and allow the player page to read the response.
const { app, BrowserWindow, ipcMain, session, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) app.quit();

const PLUTO_UA = "Mozilla/5.0 (Linux; Android 11; BackWhenTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const PLUTO_HOST = /(^|\.)(jmp2\.uk|pluto\.tv|plutotv\.net|pluto\.tv\.s3\.amazonaws\.com|cloudfront\.net)$/i;

/* ---------- settings (one small JSON file in the user's app data) ---------- */
const DEFAULTS = {
  volume: 0.8,            // 0..1
  muteWindow: false,      // silence the app's own speakers
  muteNdi: false,         // silence the NDI audio (independent of the window)
  ndiOnStart: false,      // start NDI output when the app starts
  ndiName: "BackWhenTV",  // NDI source name (your PC name is added in front)
  startFullscreen: true,  // open fullscreen, or in a normal window
  minimizeToTray: false,  // minimizing hides the window to the tray icon
  closeToTray: false,     // the close button hides to the tray instead of quitting
  launchAtLogin: false,   // start with Windows
  startChannel: 0,        // 0 = the channel you watched last, otherwise a channel number
  favorites: [],          // channel ids
  favOnly: false,         // guide and channel up/down use favorites only
  wxMode: "auto",         // weather location: "auto" (by your internet connection) or "zip"
  wxZip: "",              // US ZIP code used when wxMode is "zip"
};
let S = { ...DEFAULTS };
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
function loadSettings() {
  try { const j = JSON.parse(fs.readFileSync(settingsFile(), "utf8")); for (const k of Object.keys(DEFAULTS)) if (k in j && typeof j[k] === typeof DEFAULTS[k]) S[k] = j[k]; } catch { /* first run */ }
}
let saveT;
function saveSettings() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(S, null, 2)); } catch { /* read-only profile: keep going */ } }, 250);
}
function broadcast() {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send("settings-changed", S);
}
function applySettings() {
  try { app.setLoginItemSettings({ openAtLogin: !!S.launchAtLogin, path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath }); } catch { /* not supported here */ }
  updateTray();
  broadcast();
  saveSettings();
}
ipcMain.handle("settings-get", () => S);
ipcMain.handle("settings-set", (e, patch) => {
  if (patch && typeof patch === "object") for (const k of Object.keys(DEFAULTS)) if (k in patch && typeof patch[k] === typeof DEFAULTS[k]) S[k] = patch[k];
  applySettings();
  return S;
});

/* ---------- main window and tray ---------- */
let win, tray = null, quitting = false;
function showWin() { if (!win) return; win.show(); if (win.isMinimized()) win.restore(); win.focus(); }
function create() {
  win = new BrowserWindow({
    width: 1280, height: 720, backgroundColor: "#000000", autoHideMenuBar: true, fullscreen: !!S.startFullscreen, title: "BackWhenTV",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, webSecurity: false, backgroundThrottling: false },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.on("minimize", () => { if (S.minimizeToTray) win.hide(); });
  win.on("close", (e) => { if (S.closeToTray && !quitting) { e.preventDefault(); win.hide(); } });
  win.on("closed", () => { win = null; ndiStop(); });
}
function updateTray() {
  const want = S.minimizeToTray || S.closeToTray;
  if (!want) { if (tray) { tray.destroy(); tray = null; } if (win && !win.isVisible()) showWin(); return; }
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "icon.png")).resize({ width: 16, height: 16 }));
    tray.setToolTip("BackWhenTV");
    tray.on("click", showWin);
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show BackWhenTV", click: showWin },
    { type: "separator" },
    { label: "Mute window", type: "checkbox", checked: !!S.muteWindow, click: (m) => { S.muteWindow = m.checked; applySettings(); } },
    { label: "Mute NDI", type: "checkbox", checked: !!S.muteNdi, click: (m) => { S.muteNdi = m.checked; applySettings(); } },
    { label: "NDI output", type: "checkbox", checked: !!ndi, click: () => ndiSet(!ndi) },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]));
}

app.whenReady().then(() => {
  loadSettings();
  const ses = session.defaultSession;
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    let host = "";
    try { host = new URL(d.url).hostname; } catch { /* ignore */ }
    if (PLUTO_HOST.test(host)) { d.requestHeaders["User-Agent"] = PLUTO_UA; delete d.requestHeaders["Origin"]; delete d.requestHeaders["Referer"]; }
    cb({ requestHeaders: d.requestHeaders });
  });
  ses.webRequest.onHeadersReceived((d, cb) => {
    const h = d.responseHeaders || {};
    for (const k of Object.keys(h)) if (/^access-control-allow-/i.test(k)) delete h[k];
    h["Access-Control-Allow-Origin"] = ["*"];
    h["Access-Control-Allow-Headers"] = ["*"];
    h["Access-Control-Allow-Methods"] = ["GET, POST, OPTIONS"];
    cb({ responseHeaders: h });
  });
  create();
  applySettings();
  if (S.ndiOnStart) win.webContents.once("did-finish-load", () => ndiSet(true));
});

/* ---------- NDI output: always the fullscreen picture, whatever the real window is doing ---------- */
// A hidden 1920x1080 window renders its own copy of the player and follows the visible window (channel, guide). Its video is sent as one NDI
// source together with its own audio, so resizing, windowing or minimizing the visible window never changes what receivers see.
// Needs the NDI runtime that ships inside the grandiose package; receivers see "<PC name> (<NDI name>)".
let ndi = null; // { sender, grandiose, win, running, last, audioBusy }
const NDI_FPS = 30, NDI_W = 1920, NDI_H = 1080;
async function ndiStart() {
  if (ndi || !win) return;
  let grandiose;
  try { grandiose = require("@stagetimerio/grandiose"); } catch (e) { throw new Error("NDI library not available: " + e.message); }
  // NDI paces the video itself (clockVideo), so frames leave at a steady 30 fps instead of bunching up behind a timer
  const sender = await grandiose.send({ name: S.ndiName || "BackWhenTV", clockVideo: true, clockAudio: false });
  const nw = new BrowserWindow({
    width: NDI_W, height: NDI_H, useContentSize: true, show: false, frame: false, backgroundColor: "#000000", title: "BackWhenTV NDI",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, webSecurity: false, backgroundThrottling: false, offscreen: true },
  });
  const st = { sender, grandiose, win: nw, running: true, last: null, audioBusy: false };
  ndi = st;
  nw.webContents.setFrameRate(NDI_FPS);
  nw.webContents.setAudioMuted(true); // the picture and sound go to NDI, not to the speakers
  // render at exactly 1x so a scaled (HiDPI) desktop does not make us resize every frame
  nw.webContents.enableDeviceEmulation({ screenPosition: "desktop", screenSize: { width: NDI_W, height: NDI_H }, viewPosition: { x: 0, y: 0 }, viewSize: { width: NDI_W, height: NDI_H }, deviceScaleFactor: 1, scale: 1 });
  nw.webContents.on("paint", (e, dirty, image) => {
    let img = image;
    const sz = img.getSize();
    if (sz.width !== NDI_W || sz.height !== NDI_H) img = img.resize({ width: NDI_W, height: NDI_H, quality: "good" });
    st.last = img.toBitmap(); // BGRA, always the newest frame
  });
  nw.loadFile(path.join(__dirname, "renderer", "index.html"), { query: { ndi: "1" } });
  // one send loop: each call returns when NDI wants the next frame, and always carries the newest picture (a static screen just repeats)
  (async () => {
    while (st.running) {
      if (!st.last) { await new Promise((r) => setTimeout(r, 20)); continue; }
      try {
        await sender.video({ xres: NDI_W, yres: NDI_H, frameRateN: NDI_FPS * 1000, frameRateD: 1000, fourCC: grandiose.FOURCC_BGRA, pictureAspectRatio: NDI_W / NDI_H, frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE, lineStrideBytes: NDI_W * 4, data: st.last });
      } catch { await new Promise((r) => setTimeout(r, 50)); }
    }
  })();
  return sender.sourcename();
}
async function ndiStop() {
  if (!ndi) return;
  const st = ndi; ndi = null; st.running = false;
  try { if (!st.win.isDestroyed()) st.win.destroy(); } catch { /* gone */ }
  try { await st.sender.destroy(); } catch { /* ignore */ }
}
async function ndiSet(on) {
  let r;
  try {
    if (on) { const name = await ndiStart(); r = { on: true, name }; }
    else { await ndiStop(); r = { on: false }; }
  } catch (e) { await ndiStop(); r = { on: false, error: String(e.message || e) }; }
  if (win && !win.isDestroyed()) win.webContents.send("ndi-status", r);
  updateTray();
  return r;
}
ipcMain.handle("ndi-toggle", () => ndiSet(!ndi));
// the visible window reports what it is showing; the hidden one copies it
ipcMain.on("ndi-state", (e, state) => { if (ndi && !ndi.win.isDestroyed()) ndi.win.webContents.send("ndi-sync", state); });
ipcMain.on("ndi-ready", () => { if (win) win.webContents.send("ndi-resend"); });
// planar 32-bit float stereo blocks from the hidden window's audio graph
ipcMain.on("ndi-audio", (e, payload) => {
  const st = ndi;
  if (!st || st.audioBusy || !payload) return;
  let buf = Buffer.from(payload.data.buffer, payload.data.byteOffset, payload.data.byteLength);
  if (S.muteNdi) buf = Buffer.alloc(buf.length); // keep the stream alive but silent
  const samples = payload.samples;
  st.audioBusy = true;
  st.sender.audio({ sampleRate: payload.sampleRate, noChannels: 2, noSamples: samples, channelStrideBytes: samples * 4, fourCC: st.grandiose.FOURCC_FLTp, data: buf })
    .catch(() => {}).finally(() => { st.audioBusy = false; });
});
app.on("before-quit", () => { quitting = true; ndiStop(); });

ipcMain.on("fullscreen", () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on("quit", () => app.quit());
app.on("second-instance", () => showWin());
app.on("window-all-closed", () => app.quit());

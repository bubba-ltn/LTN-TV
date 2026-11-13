// LTN TV for Windows: a window around the player page in renderer/, plus settings, a tray icon and an NDI output.
// Keyboard and mouse only. The one job the shell does that a browser can't: Pluto's streams only answer app-like requests and send no CORS
// headers, so for those hosts we send the same user agent the Android app uses and allow the player page to read the response.
const { app, BrowserWindow, ipcMain, session, shell, Tray, Menu, nativeImage, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) app.quit();

const PLUTO_UA = "Mozilla/5.0 (Linux; Android 11; BackWhenTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const PLUTO_HOST = /(^|\.)(jmp2\.uk|pluto\.tv|plutotv\.net|pluto\.tv\.s3\.amazonaws\.com|cloudfront\.net)$/i;

/* ---------- log (app data folder, bwtv.log): what went wrong, in case something does ---------- */
const logFile = () => path.join(app.getPath("userData"), "bwtv.log");
function log(...a) {
  try {
    const line = new Date().toISOString() + " " + a.map((x) => (x && x.stack) || (typeof x === "string" ? x : JSON.stringify(x))).join(" ") + "\n";
    fs.mkdirSync(path.dirname(logFile()), { recursive: true });
    fs.appendFileSync(logFile(), line);
  } catch { /* logging must never throw */ }
}
process.on("uncaughtException", (e) => log("uncaughtException", e));
process.on("unhandledRejection", (e) => log("unhandledRejection", e));
app.on("render-process-gone", (e, wc, d) => log("render-process-gone", d));
app.on("child-process-gone", (e, d) => log("child-process-gone", d));

/* ---------- settings (one small JSON file in the user's app data) ---------- */
const DEFAULTS = {
  volume: 0.8,            // 0..1
  muteWindow: false,      // silence the app's own speakers
  muteNdi: false,         // silence the NDI audio (independent of the window)
  ndiOnStart: false,      // start NDI output when the app starts
  ndiName: "LTN TV",      // NDI source name (your PC name is added in front)
  ndiAudioOffset: 0,      // milliseconds: positive delays the NDI audio against the picture, negative advances it
  startFullscreen: true,  // open fullscreen, or in a normal window
  minimizeToTray: false,  // minimizing hides the window to the tray icon
  closeToTray: false,     // the close button hides to the tray instead of quitting
  launchAtLogin: false,   // start with Windows
  startChannel: 0,        // 0 = the channel you watched last, otherwise a channel number
  favorites: [],          // channel ids
  favOnly: false,         // guide and channel up/down use favorites only
  wxMode: "auto",         // weather location: "auto" (by your internet connection) or "zip"
  wxZip: "",              // US ZIP code used when wxMode is "zip"
  spotifyLinks: "",       // Spotify playlist links shown on LTN NEWS (empty = the built-in list)
  twitchTrailer: "",      // link to the video shown on the Twitch channel while we are offline (YouTube, Twitch video or clip)
};
let S = { ...DEFAULTS };
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
function loadSettings() {
  const read = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
  let j = read(settingsFile());
  if (!j) { // first run of LTN TV: bring over what the BackWhenTV app had saved (volume, favorites, tray options...)
    j = read(path.join(app.getPath("appData"), "BackWhenTV", "settings.json"));
    if (j && j.ndiName === "BackWhenTV") j.ndiName = "LTN TV";
  }
  if (j) for (const k of Object.keys(DEFAULTS)) if (k in j && typeof j[k] === typeof DEFAULTS[k]) S[k] = j[k];
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

/* ---------- the app serves its own page from http://localhost ---------- */
// Twitch's player only runs inside a page whose host it can verify (parent=localhost), and YouTube's player wants a real web origin; neither
// works from a file:// page. So a tiny server on this PC hands out the app's own files, and the windows load them from there.
let appUrl = null;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".json": "application/json" };
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        if (rel === "/") { res.writeHead(302, { Location: "/renderer/index.html" }); return res.end(); }
        if (rel.includes("..") || !/^\/(renderer\/[\w.\-]+|node_modules\/hls\.js\/dist\/hls\.min\.js|icon\.png)$/.test(rel)) { res.writeHead(404); return res.end(); }
        const file = path.join(__dirname, rel);
        const data = fs.readFileSync(file); // reads from inside app.asar too
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(data);
      } catch { res.writeHead(404); res.end(); }
    });
    const listen = (port, retry) => {
      server.once("error", (e) => { log("server error", e); if (retry) { server.removeAllListeners("error"); listen(0, false); } else resolve(null); });
      server.listen(port, "127.0.0.1", () => resolve("http://localhost:" + server.address().port));
    };
    listen(47831, true); // a fixed port keeps the page's saved data (last channel) between runs; any free one if it is taken
  });
}
function loadApp(w, query) {
  if (appUrl) return w.loadURL(appUrl + "/renderer/index.html" + query);
  return w.loadFile(path.join(__dirname, "renderer", "index.html"), query ? { query: { ndi: "1" } } : undefined);
}

/* ---------- main window and tray ---------- */
let win, tray = null, quitting = false;
function showWin() { if (!win) return; win.show(); if (win.isMinimized()) win.restore(); win.focus(); }
function create() {
  win = new BrowserWindow({
    width: 1280, height: 720, backgroundColor: "#000000", autoHideMenuBar: true, fullscreen: !!S.startFullscreen, title: "LTN TV",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, webSecurity: false, backgroundThrottling: false },
  });
  win.setMenuBarVisibility(false);
  loadApp(win, "").catch((e) => log("load failed", e));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("console-message", (e, level, message, line, src) => { if (level >= 3 && !/CORS|net::ERR/.test(message)) log("window error:", message, String(src) + ":" + line); });
  win.webContents.on("render-process-gone", (e, d) => log("window process gone", d));
  let moves = 0;
  const logMove = (what) => { if (moves++ < 100) log("window", what, JSON.stringify(win.getBounds()), win.isFullScreen() ? "fullscreen" : "windowed"); };
  win.on("move", () => logMove("move")); win.on("resize", () => logMove("resize"));
  win.on("minimize", () => { if (S.minimizeToTray) win.hide(); });
  win.on("close", (e) => { if (S.closeToTray && !quitting) { e.preventDefault(); win.hide(); } });
  win.on("closed", () => { win = null; ndiStop(); });
}
function updateTray() {
  const want = S.minimizeToTray || S.closeToTray;
  if (!want) { if (tray) { tray.destroy(); tray = null; } if (win && !win.isVisible()) showWin(); return; }
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "icon.png")).resize({ width: 16, height: 16 }));
    tray.setToolTip("LTN TV");
    tray.on("click", showWin);
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show LTN TV", click: showWin },
    { type: "separator" },
    { label: "Mute window", type: "checkbox", checked: !!S.muteWindow, click: (m) => { S.muteWindow = m.checked; applySettings(); } },
    { label: "Mute NDI", type: "checkbox", checked: !!S.muteNdi, click: (m) => { S.muteNdi = m.checked; applySettings(); } },
    { label: "NDI output", type: "checkbox", checked: !!ndi, click: () => ndiSet(!ndi) },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]));
}

app.whenReady().then(async () => {
  try { if (fs.statSync(logFile()).size > 512 * 1024) fs.unlinkSync(logFile()); } catch { /* no log yet */ }
  log("start", app.getVersion(), "electron", process.versions.electron);
  loadSettings();
  const ses = session.defaultSession;
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    let host = "";
    try { host = new URL(d.url).hostname; } catch { /* ignore */ }
    if (PLUTO_HOST.test(host)) { d.requestHeaders["User-Agent"] = PLUTO_UA; delete d.requestHeaders["Origin"]; delete d.requestHeaders["Referer"]; }
    // YouTube's embedded player refuses to start without a web referrer, and a file:// page has none
    if (!appUrl && d.resourceType === "subFrame" && /(^|\.)youtube(-nocookie)?\.com$/i.test(host)) d.requestHeaders["Referer"] = "https://backwhen.stream/";
    cb({ requestHeaders: d.requestHeaders });
  });
  ses.webRequest.onHeadersReceived((d, cb) => {
    if (d.referrer && !/^(http:\/\/localhost|file:)/i.test(d.referrer)) return cb({}); // made by a third-party page (YouTube, Twitch): leave its headers alone
    const h = d.responseHeaders || {};
    for (const k of Object.keys(h)) if (/^access-control-allow-/i.test(k)) delete h[k];
    h["Access-Control-Allow-Origin"] = ["*"];
    h["Access-Control-Allow-Headers"] = ["*"];
    h["Access-Control-Allow-Methods"] = ["GET, POST, OPTIONS"];
    cb({ responseHeaders: h });
  });
  appUrl = await startServer();
  log("app url", appUrl || "file (server unavailable)");
  create();
  applySettings();
  if (S.ndiOnStart) win.webContents.once("did-finish-load", () => ndiSet(true));
});

/* ---------- NDI output: always the fullscreen picture, whatever the real window is doing ---------- */
// A hidden 1920x1080 window renders its own copy of the player and follows the visible window (channel, guide). Its video is sent as one NDI
// source together with its own audio, so resizing, windowing or minimizing the visible window never changes what receivers see.
// Needs the NDI runtime that ships inside the grandiose package; receivers see "<PC name> (<NDI name>)".
let ndi = null; // { sender, grandiose, win, running, last, pending, sending, lastPaint, timer, audioBusy }
const NDI_FPS = 30, NDI_W = 1920, NDI_H = 1080;
const ndiNow = () => BigInt(Date.now()) * 10000n; // NDI timecodes count 100 ns ticks
async function ndiStart() {
  if (ndi || !win) return;
  log("ndi: starting");
  let grandiose;
  try { grandiose = require("@stagetimerio/grandiose"); } catch (e) { log("ndi: library failed to load", e); throw new Error("NDI library not available: " + e.message); }
  // No NDI clock: frames go out the moment they are painted, stamped with that moment. Audio blocks are stamped the same way, so a receiver
  // can line the two up instead of guessing from arrival time.
  const sender = await grandiose.send({ name: S.ndiName || "LTN TV", clockVideo: false, clockAudio: false });
  log("ndi: sender up", sender.sourcename());
  // On a scaled desktop an offscreen window renders at (size x scale), so ask for 1920/scale to get exactly 1920 pixels out
  const sf = (screen.getPrimaryDisplay() || {}).scaleFactor || 1;
  const nw = new BrowserWindow({
    width: Math.round(NDI_W / sf), height: Math.round(NDI_H / sf), useContentSize: true, show: false, frame: false, backgroundColor: "#000000", title: "LTN TV NDI",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, webSecurity: false, backgroundThrottling: false, offscreen: true },
  });
  const st = { sender, grandiose, win: nw, running: true, last: null, pending: null, sending: false, lastPaint: 0, timer: null, audioBusy: false, frames: 0 };
  ndi = st;
  nw.webContents.on("render-process-gone", (e, d) => { log("ndi: hidden window process gone", d); ndiSet(false); });
  nw.webContents.on("console-message", (e, level, message, line, src) => { if (level >= 3) log("ndi window error:", message, String(src) + ":" + line); });
  try { nw.webContents.setFrameRate(NDI_FPS); } catch (e) { log("ndi: setFrameRate", e); }
  try { nw.webContents.setAudioMuted(true); } catch (e) { log("ndi: setAudioMuted", e); } // the picture and sound go to NDI, not to the speakers
  nw.webContents.on("paint", (e, dirty, image) => {
    try {
      let img = image;
      const sz = img.getSize();
      if (sz.width !== NDI_W || sz.height !== NDI_H) img = img.resize({ width: NDI_W, height: NDI_H, quality: "good" });
      st.last = img.toBitmap(); // BGRA
      st.lastPaint = Date.now();
      st.pending = { data: st.last, tc: ndiNow() };
      if (++st.frames === 1) log("ndi: first frame", sz.width + "x" + sz.height);
      pump(st);
    } catch (err) { log("ndi: paint", err); }
  });
  loadApp(nw, "?ndi=1").catch((err) => log("ndi: load failed", err));
  // a static screen paints nothing, so repeat the last picture about 30 times a second
  st.timer = setInterval(() => {
    if (st.last && !st.sending && Date.now() - st.lastPaint > 80) { st.pending = { data: st.last, tc: ndiNow() }; pump(st); }
  }, Math.round(1000 / NDI_FPS));
  return sender.sourcename();
}
// send the newest picture; if one is already on its way, the next paint replaces anything still waiting
async function pump(st) {
  if (st.sending) return;
  st.sending = true;
  try {
    while (st.pending && st.running) {
      const f = st.pending; st.pending = null;
      try { await st.sender.video({ xres: NDI_W, yres: NDI_H, frameRateN: NDI_FPS * 1000, frameRateD: 1000, fourCC: st.grandiose.FOURCC_BGRA, pictureAspectRatio: NDI_W / NDI_H, frameFormatType: st.grandiose.FORMAT_TYPE_PROGRESSIVE, lineStrideBytes: NDI_W * 4, data: f.data, timecode: f.tc }); }
      catch (err) { if (!st.videoErrLogged) { st.videoErrLogged = true; log("ndi: video send failed", err); } }
    }
  } finally { st.sending = false; }
}
async function ndiStop() {
  if (!ndi) return;
  const st = ndi; ndi = null; st.running = false; clearInterval(st.timer);
  log("ndi: stopping");
  try { if (!st.win.isDestroyed()) st.win.destroy(); } catch (e) { log("ndi: window destroy", e); }
  try { await st.sender.destroy(); } catch (e) { log("ndi: sender destroy", e); }
}
async function ndiSet(on) {
  let r;
  try {
    if (on) { const name = await ndiStart(); r = { on: true, name }; }
    else { await ndiStop(); r = { on: false }; }
  } catch (e) { log("ndi: error", e); await ndiStop(); r = { on: false, error: String(e.message || e) }; }
  try { if (win && !win.isDestroyed()) win.webContents.send("ndi-status", r); } catch (e) { log("ndi: status send", e); }
  try { updateTray(); } catch (e) { log("ndi: tray", e); }
  return r;
}
ipcMain.handle("ndi-toggle", () => ndiSet(!ndi));
// the visible window reports what it is showing; the hidden one copies it
ipcMain.on("ndi-state", (e, state) => { try { if (ndi && !ndi.win.isDestroyed()) ndi.win.webContents.send("ndi-sync", state); } catch (err) { log("ndi: sync", err); } });
ipcMain.on("ndi-ready", () => { try { if (win) win.webContents.send("ndi-resend"); } catch (err) { log("ndi: resend", err); } });
// planar 32-bit float stereo blocks from the hidden window's audio graph
ipcMain.on("ndi-audio", (e, payload) => {
  const st = ndi;
  if (!st || st.audioBusy || !payload) return;
  try {
    let buf = Buffer.from(payload.data.buffer, payload.data.byteOffset, payload.data.byteLength);
    if (S.muteNdi) buf = Buffer.alloc(buf.length); // keep the stream alive but silent
    const samples = payload.samples;
    // the block ended about now, so it began one block-length ago; the user's offset trims any remaining mismatch
    const blockMs = Math.round(samples / payload.sampleRate * 1000);
    const tc = ndiNow() - BigInt(blockMs) * 10000n + BigInt(Math.round(S.ndiAudioOffset || 0)) * 10000n;
    st.audioBusy = true;
    st.sender.audio({ sampleRate: payload.sampleRate, noChannels: 2, noSamples: samples, channelStrideBytes: samples * 4, fourCC: st.grandiose.FOURCC_FLTp, data: buf, timecode: tc })
      .catch((err) => { if (!st.audioErrLogged) { st.audioErrLogged = true; log("ndi: audio send failed", err); } }).finally(() => { st.audioBusy = false; });
  } catch (err) { st.audioBusy = false; log("ndi: audio", err); }
});
app.on("before-quit", () => { quitting = true; ndiStop(); });

ipcMain.on("fullscreen", () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on("quit", () => app.quit());
app.on("second-instance", () => showWin());
app.on("window-all-closed", () => app.quit());

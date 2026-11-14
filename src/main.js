// LTN TV for Windows: a window around the player page in renderer/, plus settings and a tray icon.
// Keyboard and mouse only. The one job the shell does that a browser can't: Pluto's streams only answer app-like requests and send no CORS
// headers, so for those hosts we send the same user agent the Android app uses and allow the player page to read the response.
const { app, BrowserWindow, ipcMain, session, shell, Tray, Menu, nativeImage, dialog, net } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { fetchMissions } = require("./missions");

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
  startFullscreen: true,  // open fullscreen, or in a normal window
  minimizeToTray: false,  // minimizing hides the window to the tray icon
  closeToTray: false,     // the close button hides to the tray instead of quitting
  launchAtLogin: false,   // start with Windows
  startChannel: 1,        // 0 = the channel you watched last, otherwise a channel number (new installs start on channel 1)
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
// the mission trips shown in LTN News: read from the public missions site by a hidden window (see missions.js); the page cannot ask for any other address
let missionsBusy = null;
ipcMain.handle("missions-fetch", async () => {
  if (!missionsBusy) missionsBusy = fetchMissions().catch((e) => { log("missions fetch failed", e.message); return null; }).finally(() => { missionsBusy = null; });
  return missionsBusy;
});
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
function loadApp(w) {
  if (appUrl) return w.loadURL(appUrl + "/renderer/index.html");
  return w.loadFile(path.join(__dirname, "renderer", "index.html"));
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
  loadApp(win).catch((e) => log("load failed", e));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("console-message", (e, level, message, line, src) => { if (level >= 3 && !/CORS|net::ERR/.test(message)) log("window error:", message, String(src) + ":" + line); });
  win.webContents.on("render-process-gone", (e, d) => log("window process gone", d));
  let moves = 0;
  const logMove = (what) => { if (moves++ < 100) log("window", what, JSON.stringify(win.getBounds()), win.isFullScreen() ? "fullscreen" : "windowed"); };
  win.on("move", () => logMove("move")); win.on("resize", () => logMove("resize"));
  win.on("minimize", () => { if (S.minimizeToTray) win.hide(); });
  win.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    if (S.closeToTray) return win.hide(); // the user chose the tray
    askQuit();                            // otherwise: ask before closing
  });
  win.on("session-end", () => { quitting = true; }); // Windows is logging off or shutting down: do not hold it up
  win.on("closed", () => { win = null; });
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
    { type: "separator" },
    { label: "Check for updates", click: () => { showWin(); checkUpdate(true); } },
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
  setTimeout(() => checkUpdate(false), 8000);
  setInterval(() => checkUpdate(false), 6 * 3600 * 1000);
});

// Esc in the player and the window's X both ask before the app closes: the page shows the question; if it does not answer, Windows asks instead
let quitAck = false;
ipcMain.on("quit-prompt-shown", () => { quitAck = true; });
function askQuit() {
  if (!win || win.isDestroyed()) return;
  quitAck = false;
  showWin();
  win.webContents.send("ask-quit");
  setTimeout(() => {
    if (quitAck || !win || win.isDestroyed()) return;
    const r = dialog.showMessageBoxSync(win, { type: "question", buttons: ["Close LTN TV", "Keep watching"], defaultId: 0, cancelId: 1, title: "LTN TV", message: "Close LTN TV?", detail: "This stops all channels." });
    if (r === 0) { quitting = true; app.quit(); }
  }, 900);
}
/* ---------- updates: look for a newer GitHub release, ask, download the installer, run it ---------- */
const REPO = "bubba-ltn/LTN-TV";
let updInfo = null, updBusy = false, updAsked = "";
const verNum = (v) => String(v).replace(/^v/i, "").split(".").map((x) => parseInt(x, 10) || 0);
const verNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
async function checkUpdate(manual) {
  try {
    const r = await net.fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { headers: { Accept: "application/vnd.github+json", "User-Agent": "LTN-TV" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const portable = !!process.env.PORTABLE_EXECUTABLE_FILE;
    const asset = (j.assets || []).find((a) => (portable ? /portable/i : /setup/i).test(a.name) && /\.exe$/i.test(a.name));
    if (!j.tag_name || !verNewer(j.tag_name, app.getVersion())) { log("update: current", app.getVersion(), "latest", j.tag_name); if (manual && win) win.webContents.send("update-none"); return; }
    updInfo = { version: String(j.tag_name).replace(/^v/i, ""), notes: String(j.body || "").slice(0, 600), url: j.html_url, asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size } : null, portable };
    log("update available", updInfo.version);
    if (manual || updAsked !== updInfo.version) { updAsked = updInfo.version; if (win && !win.isDestroyed()) win.webContents.send("update-available", { version: updInfo.version, notes: updInfo.notes, portable }); }
  } catch (e) { log("update check failed", e.message); if (manual && win) win.webContents.send("update-none", String(e.message)); }
}
ipcMain.on("update-check", () => checkUpdate(true));
ipcMain.on("update-go", async () => {
  if (!updInfo || updBusy) return;
  if (!updInfo.asset || updInfo.portable) { shell.openExternal(updInfo.url); return; } // the portable build cannot replace itself: open the release page instead
  updBusy = true;
  const send = (c, p) => { if (win && !win.isDestroyed()) win.webContents.send(c, p); };
  try {
    const file = path.join(app.getPath("temp"), updInfo.asset.name);
    const r = await net.fetch(updInfo.asset.url, { headers: { "User-Agent": "LTN-TV" } });
    if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
    const total = +r.headers.get("content-length") || updInfo.asset.size || 0;
    const out = fs.createWriteStream(file);
    let got = 0, last = 0;
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (!out.write(value)) await new Promise((ok) => out.once("drain", ok));
      if (total && Date.now() - last > 250) { last = Date.now(); send("update-progress", Math.round((got / total) * 100)); }
    }
    await new Promise((ok, no) => { out.end(); out.on("finish", ok); out.on("error", no); });
    if (total && got < total) throw new Error("download was cut short");
    send("update-progress", 100);
    log("update downloaded", file);
    require("child_process").spawn(file, [], { detached: true, stdio: "ignore" }).unref();
    quitting = true;
    setTimeout(() => app.quit(), 600);
  } catch (e) { log("update failed", e.message); send("update-failed", String(e.message)); }
  updBusy = false;
});

app.on("before-quit", () => { quitting = true; });

ipcMain.on("fullscreen", () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on("quit", () => app.quit());
app.on("second-instance", () => showWin());
app.on("window-all-closed", () => app.quit());

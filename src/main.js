// BackWhenTV for Windows: a full-screen window around the player page in renderer/.
// Keyboard and mouse only. The one job the shell does that a browser can't: Pluto's streams only answer app-like requests and send no CORS
// headers, so for those hosts we send the same user agent the Android app uses and allow the player page to read the response.
const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const path = require("path");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (!app.requestSingleInstanceLock()) app.quit();

const PLUTO_UA = "Mozilla/5.0 (Linux; Android 11; BackWhenTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const PLUTO_HOST = /(^|\.)(jmp2\.uk|pluto\.tv|plutotv\.net|pluto\.tv\.s3\.amazonaws\.com|cloudfront\.net)$/i;

let win;
function create() {
  win = new BrowserWindow({
    width: 1280, height: 720, backgroundColor: "#000000", autoHideMenuBar: true, fullscreen: true, title: "BackWhenTV",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, webSecurity: false, backgroundThrottling: false },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.on("closed", () => { win = null; });
}

app.whenReady().then(() => {
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
});

ipcMain.on("fullscreen", () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on("quit", () => app.quit());
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => app.quit());

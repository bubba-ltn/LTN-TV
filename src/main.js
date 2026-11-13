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

/* ---------- NDI output: the whole app window (video) plus the program audio, as one NDI source ---------- */
// Needs the NDI runtime that ships inside the grandiose package; receivers on the network see "<PC name> (BackWhenTV)".
let ndi = null; // { sender, timer, last, busy, audioBusy }
const NDI_FPS = 30;
async function ndiStart() {
  if (ndi || !win) return;
  let grandiose;
  try { grandiose = require("@stagetimerio/grandiose"); } catch (e) { throw new Error("NDI library not available: " + e.message); }
  const sender = await grandiose.send({ name: "BackWhenTV", clockVideo: false, clockAudio: false });
  const st = { sender, grandiose, timer: null, last: null, busy: false, audioBusy: false };
  ndi = st;
  win.webContents.beginFrameSubscription(false, (image) => {
    const { width, height } = image.getSize();
    if (width && height) st.last = { width, height, data: image.toBitmap() };
  });
  // Chromium only paints when something changes, so resend the newest frame on a steady clock: receivers want a constant frame rate.
  st.timer = setInterval(() => {
    if (st.busy || !st.last) return;
    const f = st.last; st.busy = true;
    sender.video({ xres: f.width, yres: f.height, frameRateN: NDI_FPS * 1000, frameRateD: 1000, fourCC: grandiose.FOURCC_BGRA, pictureAspectRatio: f.width / f.height, frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE, lineStrideBytes: f.width * 4, data: f.data })
      .catch(() => {}).finally(() => { st.busy = false; });
  }, Math.round(1000 / NDI_FPS));
  return sender.sourcename();
}
async function ndiStop() {
  if (!ndi) return;
  const st = ndi; ndi = null;
  clearInterval(st.timer);
  try { if (win) win.webContents.endFrameSubscription(); } catch { /* window gone */ }
  try { await st.sender.destroy(); } catch { /* ignore */ }
}
ipcMain.handle("ndi-toggle", async () => {
  try {
    if (ndi) { await ndiStop(); return { on: false }; }
    const name = await ndiStart();
    return { on: true, name };
  } catch (e) { return { on: false, error: String(e.message || e) }; }
});
// planar 32-bit float stereo blocks from the page's audio graph
ipcMain.on("ndi-audio", (e, payload) => {
  const st = ndi;
  if (!st || st.audioBusy || !payload) return;
  const buf = Buffer.from(payload.data.buffer, payload.data.byteOffset, payload.data.byteLength);
  const samples = payload.samples;
  st.audioBusy = true;
  st.sender.audio({ sampleRate: payload.sampleRate, noChannels: 2, noSamples: samples, channelStrideBytes: samples * 4, fourCC: st.grandiose.FOURCC_FLTp, data: buf })
    .catch(() => {}).finally(() => { st.audioBusy = false; });
});
app.on("before-quit", () => { ndiStop(); });

ipcMain.on("fullscreen", () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on("quit", () => app.quit());
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => app.quit());

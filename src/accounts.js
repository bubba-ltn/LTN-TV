// Sign in to Twitch / YouTube (Google) so their players know who is watching (ad-free with Twitch Turbo or YouTube Premium, subscriber perks...).
//
// What this file does NOT do, on purpose:
//   * it never sees, reads, copies, stores, logs or sends a password, a code or a token. You type them into the real twitch.tv / accounts.google.com page,
//     which is shown in its own window. That window has no preload script, no connection to the app, and nothing is injected into it.
//   * it never reads a cookie's value. It only asks "does a login cookie exist?" (yes/no) to show SIGNED IN or SIGNED OUT.
//   * it never sends anything anywhere. There is no LTN server for accounts, no analytics, no list of who signed in.
// The only thing kept is the site's own login cookie, in this app's data folder on this PC, exactly as a browser keeps it. Sign out deletes it.
const { BrowserWindow, session } = require("electron");

const SERVICES = {
  twitch: {
    name: "Twitch",
    start: "https://www.twitch.tv/login",
    hosts: /(^|\.)twitch\.tv$/i, // the only addresses the window may go to
    cookies: [{ domain: "twitch.tv", names: ["auth-token"] }], // what "signed in" looks like (only whether it exists is checked)
    wipe: ["twitch.tv", "twitchcdn.net", "ttvnw.net"],
    origins: ["https://www.twitch.tv", "https://player.twitch.tv", "https://passport.twitch.tv", "https://id.twitch.tv"],
  },
  youtube: {
    name: "YouTube",
    start: "https://accounts.google.com/ServiceLogin?service=youtube&continue=" + encodeURIComponent("https://www.youtube.com/"),
    hosts: /(^|\.)(google\.[a-z]{2,3}(\.[a-z]{2})?|youtube\.com)$/i,
    cookies: [{ domain: "google.com", names: ["SID", "__Secure-1PSID", "__Secure-3PSID"] }, { domain: "youtube.com", names: ["LOGIN_INFO"] }],
    wipe: ["google.com", "youtube.com", "youtube-nocookie.com", "gstatic.com"],
    origins: ["https://www.youtube.com", "https://accounts.google.com", "https://accounts.youtube.com", "https://www.google.com", "https://www.youtube-nocookie.com"],
  },
};

const ses = () => session.defaultSession; // the same session the players use, so they pick the login up
const known = (svc) => (typeof svc === "string" && Object.prototype.hasOwnProperty.call(SERVICES, svc) ? SERVICES[svc] : null);

async function isSignedIn(svc) {
  const s = known(svc);
  if (!s) return false;
  for (const c of s.cookies) {
    for (const name of c.names) {
      try { if ((await ses().cookies.get({ domain: c.domain, name })).length) return true; } catch { /* treat as signed out */ }
    }
  }
  return false;
}
async function status() { return { twitch: await isSignedIn("twitch"), youtube: await isSignedIn("youtube") }; }

// remove the login from this PC: the site's cookies and saved page data, nothing else
async function signOut(svc) {
  const s = known(svc);
  if (!s) return false;
  const cs = ses().cookies;
  for (const d of s.wipe) {
    let list = [];
    try { list = await cs.get({ domain: d }); } catch { /* nothing to remove */ }
    for (const c of list) {
      const host = String(c.domain || "").replace(/^\./, "");
      try { await cs.remove((c.secure ? "https://" : "http://") + host + (c.path || "/"), c.name); } catch { /* already gone */ }
    }
  }
  for (const o of s.origins) { try { await ses().clearStorageData({ origin: o }); } catch { /* nothing stored */ } }
  try { await cs.flushStore(); } catch { /* ignore */ }
  return true;
}
async function signOutAll() { await signOut("twitch"); await signOut("youtube"); }

let open = null; // one sign-in window at a time
function signIn(svc, parent, onDone) {
  const s = known(svc);
  if (!s) return false;
  if (open && !open.isDestroyed()) { open.focus(); return true; }
  const w = new BrowserWindow({
    parent: parent || undefined, modal: !!parent, width: 520, height: 760, minWidth: 420, minHeight: 560, show: false,
    autoHideMenuBar: true, title: "Sign in to " + s.name, backgroundColor: "#111111", fullscreenable: false, minimizable: false,
    webPreferences: { session: ses(), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, devTools: false, spellcheck: false, autoplayPolicy: "document-user-activation-required" },
  });
  open = w;
  w.removeMenu();
  const wc = w.webContents;
  // look like the plain browser engine this is (Google refuses to sign in to windows that call themselves "Electron")
  wc.setUserAgent(wc.userAgent.replace(/\s*Electron\/\S+/i, "").replace(/\s*[\w.-]*(ltn|backwhen)[\w.-]*\/\S+/gi, ""));
  const ok = (u) => { try { const x = new URL(u); return x.protocol === "https:" && s.hosts.test(x.hostname); } catch { return false; } };
  // the address bar is not shown, so the title says where you really are
  const title = () => { try { w.setTitle("Sign in to " + s.name + "  •  " + new URL(wc.getURL()).hostname + "  •  secure connection"); } catch { /* ignore */ } };
  wc.on("will-navigate", (e, u) => { if (!ok(u)) e.preventDefault(); });
  wc.on("will-redirect", (e, u) => { if (!ok(u)) e.preventDefault(); });
  wc.setWindowOpenHandler(({ url }) => { if (ok(url)) setImmediate(() => { if (!wc.isDestroyed()) wc.loadURL(url); }); return { action: "deny" }; }); // pop-ups open in this window, or not at all
  wc.on("page-title-updated", (e) => e.preventDefault());
  let finished = false;
  const check = async () => { // after each page: are we signed in now? then close
    title();
    if (finished || !(await isSignedIn(svc))) return;
    finished = true;
    setTimeout(() => { try { if (!w.isDestroyed()) w.close(); } catch { /* gone */ } }, 1200);
  };
  wc.on("did-navigate", check);
  wc.on("did-navigate-in-page", check);
  wc.on("did-finish-load", check);
  w.once("ready-to-show", () => { title(); w.show(); });
  w.on("closed", () => { open = null; try { ses().cookies.flushStore(); } catch { /* ignore */ } if (onDone) onDone(); });
  w.loadURL(s.start).catch(() => { try { if (!w.isDestroyed()) w.close(); } catch { /* gone */ } });
  return true;
}

const isSignInContents = (wc) => !!(open && !open.isDestroyed() && open.webContents === wc);

module.exports = { isSignInContents, signIn, signOut, signOutAll, status, SERVICES };

// Reads the upcoming trips from https://missions.lovethynerd.com the way a visitor's browser sees them.
// That site draws its trips in the browser, so the page's HTML has none and its data calls only answer their own page. So a hidden, locked-down window
// loads the public page, waits for the trip cards, and copies out what is on screen. Nothing is clicked, signed into or sent; the window is thrown away after.
const { BrowserWindow, session } = require("electron");

const URL_MISSIONS = "https://missions.lovethynerd.com/";

// runs inside the page: one entry per trip card (a link to /trips/<name>)
const EXTRACT = `(() => {
  const clean = (s) => String(s || "").replace(/\\s+/g, " ").trim();
  const out = [], seen = new Set();
  for (const a of document.querySelectorAll('a[href^="/trips/"]')) {
    const href = a.getAttribute("href");
    if (seen.has(href)) continue;
    const title = clean((a.querySelector("h1,h2,h3") || {}).textContent);
    if (!title) continue;
    seen.add(href);
    const cal = a.querySelector("svg.lucide-calendar-days"), pin = a.querySelector("svg.lucide-map-pin");
    const money = [...a.querySelectorAll(".sr-only")].map((e) => clean(e.parentElement && e.parentElement.textContent)).find((t) => /total cost/i.test(t)) || "";
    const text = clean(a.textContent);
    const lead = /trip leader\\s*(.+)$/i.exec(text);
    const img = a.querySelector("img");
    out.push({
      slug: href.replace(/^\\/trips\\//, ""),
      title,
      when: cal ? clean(cal.parentElement.textContent) : "",
      where: pin ? clean(pin.parentElement.textContent) : "",
      cost: (/\\$[\\d,]+(?:\\.\\d+)?/.exec(money) || [""])[0],
      leader: lead ? lead[1] : "",
      img: img ? (img.currentSrc || img.src || "") : "",
      next: /^next trip/i.test(text),
    });
  }
  return out;
})()`;

async function fetchMissions({ timeoutMs = 25000 } = {}) {
  const ses = session.fromPartition("ltn-missions"); // its own in-memory session: no cookies or logins shared with anything else
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(false));
  const win = new BrowserWindow({
    show: false, width: 1280, height: 900, skipTaskbar: true, focusable: false,
    webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, backgroundThrottling: false, devTools: false, autoplayPolicy: "document-user-activation-required" },
  });
  win.webContents.setAudioMuted(true);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(URL_MISSIONS)) e.preventDefault(); });
  const timer = setTimeout(() => { try { win.destroy(); } catch { /* gone */ } }, timeoutMs + 3000);
  try {
    await Promise.race([win.loadURL(URL_MISSIONS), new Promise((_, no) => setTimeout(() => no(new Error("missions page did not load")), timeoutMs))]);
    const t0 = Date.now();
    let firstSeen = 0;
    for (;;) { // the trips appear a moment after the page loads
      if (win.isDestroyed()) throw new Error("window closed");
      const list = await win.webContents.executeJavaScript(EXTRACT);
      if (Array.isArray(list) && list.length) {
        // the pictures arrive a moment after the cards: give them a few seconds (a trip with no picture of its own keeps the site's placeholder)
        if (!firstSeen) firstSeen = Date.now();
        const settled = list.every((t) => t.img && !/placeholder/i.test(t.img));
        if (settled || Date.now() - firstSeen > 6000) return list.slice(0, 40);
      }
      if (!firstSeen && Date.now() - t0 > timeoutMs) throw new Error("no trips on the missions page");
      await new Promise((r) => setTimeout(r, 600));
    }
  } finally {
    clearTimeout(timer);
    try { if (!win.isDestroyed()) win.destroy(); } catch { /* gone */ }
  }
}

module.exports = { fetchMissions, EXTRACT, URL_MISSIONS };

// LTN TV for Windows (built from the BackWhenTV player): the Love Thy Nerd channels, the guide, settings, NDI output.
// and our own bumper clips covering Pluto's looping placeholder. Same rules as the Android app.
const BASE = "https://backwhen.stream";
const NDI_MODE = new URLSearchParams(location.search).has("ndi"); // the hidden 1920x1080 copy that feeds NDI
const VERSION = "1.0";
const $ = (s) => document.querySelector(s);
const v = $("#v"), v2 = $("#v2");
let channels = [], schedules = {}, epg = {}, plutoUrls = {}, plutoAt = 0, anchor = 0;
let tuned = 0, mode = "tv", tuneGen = 0, started = false, hls = null, wxTimer = null;
const totals = {};
const bad = new Set();

/* ---------- settings (stored by the main process; the browser fallback keeps them in localStorage) ---------- */
let S = { spotifyLinks: "", twitchTrailer: "", volume: 0.8, muteWindow: false, muteNdi: false, ndiOnStart: false, ndiName: "LTN TV", ndiAudioOffset: 0, startFullscreen: true, minimizeToTray: false, closeToTray: false, launchAtLogin: false, startChannel: 0, favorites: [], favOnly: false, wxMode: "auto", wxZip: "" };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
function setS(p) {
  Object.assign(S, p);
  if (window.bw && window.bw.setSettings) window.bw.setSettings(p);
  else { try { localStorage.setItem("bw-settings", JSON.stringify(S)); } catch { /* private mode */ } }
  applyS();
}
function applyS() {
  const vol = NDI_MODE ? 1 : clamp01(S.volume);
  v.volume = vol; v2.volume = vol;
  muted = NDI_MODE ? false : !!S.muteWindow; // the speakers; NDI audio has its own mute in the main process
  v.muted = muted || swapActive; v2.muted = muted;
  if (mode === "guide") renderGuide();
  if (settingsOpen) renderSettings();
  ytAudio();
}
async function loadS() {
  try {
    if (window.bw && window.bw.getSettings) S = { ...S, ...(await window.bw.getSettings()) };
    else S = { ...S, ...JSON.parse(localStorage.getItem("bw-settings") || "{}") };
  } catch { /* defaults */ }
  if (window.bw && window.bw.onSettings) window.bw.onSettings((s) => { S = { ...S, ...s }; applyS(); });
  applyS();
}
const isFav = (id) => S.favorites.includes(id);
function toggleFav(id) {
  if (!id) return;
  const on = !isFav(id);
  setS({ favorites: on ? [...S.favorites, id] : S.favorites.filter((x) => x !== id) });
  flash(on ? "★ ADDED TO FAVORITES" : "REMOVED FROM FAVORITES");
}
// channel indexes the guide and channel up/down move through: everything, or only favorites when that is switched on and any exist
function chList() {
  const all = channels.map((c, i) => i);
  if (!S.favOnly) return all;
  const f = all.filter((i) => isFav(channels[i].id));
  return f.length ? f : all;
}
function surf(d) {
  const list = chList(), p = list.indexOf(tuned);
  if (p < 0) { const cand = d > 0 ? list.find((i) => i > tuned) : [...list].reverse().find((i) => i < tuned); return tune(cand ?? (d > 0 ? list[0] : list[list.length - 1])); } // current channel is not a favorite: nearest one
  tune(list[(p + d + list.length) % list.length]);
}

const clock = (ms) => { const d = new Date(ms); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "P" : "A"; h = h % 12 || 12; return h + ":" + String(m).padStart(2, "0") + ap; };
const jget = (path) => fetch(BASE + path, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(path + " " + r.status); return r.json(); });

/* ---------- schedules (Internet Archive channels loop on a wall clock) ---------- */
function slotAt(ch, nowSec) {
  const s = schedules[ch.id];
  if (!s || !s.items.length) return null;
  if (!totals[ch.id]) totals[ch.id] = s.items.reduce((a, i) => a + i.d, 0);
  const total = totals[ch.id];
  const pos = (((nowSec - (s.anchor || anchor)) % total) + total) % total;
  let acc = 0;
  for (let i = 0; i < s.items.length; i++) {
    const it = s.items[i];
    if (pos < acc + it.d) return { i, it, start: nowSec - (pos - acc), offset: pos - acc };
    acc += it.d;
  }
  return null;
}
const nextOf = (ch, slot) => { const it = schedules[ch.id].items; let i = slot.i; do { i = (i + 1) % it.length; } while (it[i].a && i !== slot.i); return it[i]; }; // skips breaks

function plutoNow(ch, nowSec) {
  const list = epg[ch.pluto];
  if (!list) return null;
  for (let i = 0; i < list.length; i++) if (nowSec >= list[i][0] && nowSec < list[i][1]) return { cur: list[i], next: list[i + 1] };
  return null;
}
function nowLine(ch, nowSec) {
  if (ch.kind === "pluto") {
    const p = plutoNow(ch, nowSec);
    return p ? { t: p.cur[2] + (p.cur[3] ? " - " + p.cur[3] : ""), n: p.next ? p.next[2] : "" } : { t: ch.blurb || "Live", n: "" };
  }
  if (ch.kind === "weather") return { t: "Local forecast", n: "" };
  if (ltnIsOwn(ch)) return ltnNow(ch);
  const slot = slotAt(ch, nowSec);
  return slot ? { t: slot.it.a ? "COMMERCIAL BREAK" : slot.it.t, n: nextOf(ch, slot).t } : { t: "LOADING GUIDE DATA...", n: "" };
}

async function boot() {
  await loadS();
  channels = [];
  if (!LTN.ltnOnly) { // the original BackWhenTV lineup; LTN TV leaves it out
    const [lu, all] = await Promise.all([jget("/api/lineup"), jget("/api/schedules?pods=1")]);
    anchor = all.anchor;
    schedules = all.schedules;
    channels = lu.channels.filter((c) => c.kind !== "board" && (c.kind === "pluto" || c.kind === "weather" || schedules[c.id])).sort((a, b) => a.num - b.num);
  }
  injectLtnChannels(); // our own Love Thy Nerd channels (ltn.js)
  ltnStart();
  if (!LTN.ltnOnly) { jget("/api/epg").then((e) => { epg = e.programs || {}; if (mode === "guide") renderGuide(); }).catch(() => {}); loadClips(); }
  const last = localStorage.getItem("bw-last");
  let ti = S.startChannel ? channels.findIndex((c) => c.num === S.startChannel) : -1;
  if (ti < 0) ti = channels.findIndex((c) => c.id === last);
  tuned = Math.max(0, ti);
  $("#start .go").textContent = "PRESS ANY KEY OR CLICK TO TUNE IN";
  renderGuide();
}

/* ---------- UI bits ---------- */
function showMsg(t) { const m = $("#msg"); m.textContent = t || ""; m.style.display = t ? "flex" : "none"; }
let msgTimer;
function flash(t) { showMsg(t); clearTimeout(msgTimer); msgTimer = setTimeout(() => showMsg(""), 1400); }
let bannerTimer;
function banner() {
  const ch = channels[tuned];
  if (!ch) return;
  const l = nowLine(ch, Date.now() / 1000);
  $("#bnum").textContent = ch.num; $("#bname").textContent = ch.name;
  $("#btitle").textContent = l.t;
  $("#bnext").textContent = l.n ? "NEXT: " + l.n : "";
  $("#bclock").textContent = clock(Date.now());
  $("#banner").classList.add("on");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => $("#banner").classList.remove("on"), 4500);
}
const loadingOn = (on) => { $("#bars").style.display = on ? "flex" : "none"; };

/* ---------- tuning ---------- */
function stopAll() {
  preview.stop();
  clearTimeout(podTimer);
  endSwap("tune", true);
  if (hls) { try { hls.destroy(); } catch { /* gone */ } hls = null; }
  clearInterval(wxTimer); wxTimer = null;
  $("#wx").classList.remove("on");
  ltnStop();
  v.onloadedmetadata = v.onplaying = v.onended = v.onerror = null;
  v.removeAttribute("src"); v.load();
  slate.reset();
}

function tune(idx, showBanner = true) {
  if (!channels.length) return;
  tuned = ((idx % channels.length) + channels.length) % channels.length;
  const ch = channels[tuned], gen = ++tuneGen;
  localStorage.setItem("bw-last", ch.id);
  stopAll();
  showMsg("");
  usage.switchTo(ltnIsOwn(ch) ? null : ch.id); // our own channels are not part of the lineup stats
  if (ch.kind === "pluto") playPluto(ch, gen, false);
  else if (ch.kind === "weather") playWeather(ch, gen);
  else if (ch.kind === "ltn") playLtn(ch, gen);
  else if (ch.kind === "yt") playYt(ch, gen);
  else if (ch.kind === "twitch") playTwitch(ch, gen);
  else playSlot(ch, gen, 0);
  if (showBanner) banner();
  renderGuide();
  syncOut();
}

function playSlot(ch, gen, skip) {
  const slot = slotAt(ch, Date.now() / 1000);
  if (!slot) { loadingOn(false); return showMsg("NO SIGNAL"); }
  if (slot.it.a && allClips.length) return playPod(ch, gen, slot);
  prefetchPod(ch, slot);
  const s = schedules[ch.id];
  let it = slot.it, offset = slot.offset;
  for (let k = 0; k < skip + s.items.length && bad.has(it.u + (it._fb ? "#f" : "")); k++) { // skip broken files; start the next show from the top
    it = s.items[(slot.i + 1 + k) % s.items.length]; offset = 0;
  }
  loadingOn(true);
  const src = it._fb && it.f ? it.f : it.u;
  v.onloadedmetadata = () => { if (gen === tuneGen && offset > 1 && offset < (v.duration || 1e9)) v.currentTime = offset; };
  v.onplaying = () => { if (gen === tuneGen) loadingOn(false); };
  v.onended = () => { if (gen === tuneGen) playSlot(ch, gen, 0); };
  v.onerror = () => {
    if (gen !== tuneGen) return;
    if (it.f && !it._fb) { it._fb = true; playSlot(ch, gen, 0); } // storage server moved? try archive.org's own link
    else { bad.add(it.u + (it._fb ? "#f" : "")); loadingOn(false); showMsg("NO SIGNAL"); setTimeout(() => { if (gen === tuneGen) { showMsg(""); playSlot(ch, gen, 1); } }, 1500); }
  };
  v.src = src;
  v.play().catch(() => {});
}

/* ---------- Pluto (live) ---------- */
async function plutoUrl(id, force) {
  if (force || !plutoUrls[id] || Date.now() - plutoAt > 20 * 60000) {
    plutoUrls = (await jget("/api/pluto")).urls || {};
    plutoAt = Date.now();
  }
  if (!plutoUrls[id]) throw new Error("no stream");
  return plutoUrls[id];
}
async function playPluto(ch, gen, retried) {
  loadingOn(true);
  try {
    const url = await plutoUrl(ch.pluto, retried);
    if (gen !== tuneGen) return;
    if (!Hls.isSupported()) throw new Error("no hls");
    hls = new Hls({ liveSyncDurationCount: 3, maxBufferLength: 30, backBufferLength: 20, manifestLoadingMaxRetry: 2, levelLoadingMaxRetry: 3, fragLoadingMaxRetry: 4 });
    hls.on(Hls.Events.LEVEL_UPDATED, (e, d) => slate.check(ch, d.details));
    hls.on(Hls.Events.ERROR, (e, d) => {
      if (!d.fatal || gen !== tuneGen) return;
      if (!retried) { stopAll(); playPluto(ch, gen, true); } // the link may have rotated: fetch a fresh one once
      else { loadingOn(false); showMsg("NO SIGNAL"); }
    });
    v.onplaying = () => { if (gen === tuneGen) loadingOn(false); };
    hls.loadSource(url);
    hls.attachMedia(v);
    v.play().catch(() => {});
  } catch {
    if (gen !== tuneGen) return;
    loadingOn(false); showMsg("NO SIGNAL");
  }
}


/* ---------- commercial breaks between episodes ---------- */
// A pod slot (item flagged a:1) is filled with: a sponsor spot (paid sponsor if there is one, else our own "your ad here"), a trivia card,
// and a donate/sponsor ask, with stingers up front to fill the time. Everything is chosen from the pod's start time, so every viewer sees the same break.
function podRng(seed) {
  let a = 2166136261;
  for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619) >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function podPlan(chId, startSec, total) {
  const of = (type) => allClips.filter((c) => c.type === type);
  const rand = podRng(chId + ":" + startSec);
  const pick = (arr) => (arr.length ? arr[Math.floor(rand() * arr.length)] : null);
  const sponsored = of("sponsored"), house = of("sponsor");
  const spots = [
    pick(sponsored.length ? sponsored : house),
    pick(of("trivia")),
    sponsored.length && rand() < 0.5 ? pick(house) : pick(of("donate")),
  ].filter(Boolean);
  let fill = total - spots.reduce((a, c) => a + c.dur, 0);
  const stingers = of("stinger").sort((a, b) => b.dur - a.dur);
  const lead = [];
  for (const s of stingers) while (fill >= s.dur - 0.01 && fill >= 2 && lead.length < 4) { lead.push(s); fill -= s.dur; }
  return lead.concat(spots);
}
const warmed = new Set();
function prefetchPod(ch, slot) {
  const items = schedules[ch.id].items, nx = items[(slot.i + 1) % items.length];
  if (!nx || !nx.a || !allClips.length) return;
  const start = Math.round(slot.start + slot.it.d);
  const key = ch.id + ":" + start;
  if (warmed.has(key)) return;
  warmed.add(key);
  for (const c of podPlan(ch.id, start, nx.d)) fetch(c.url).catch(() => {});
}
let podTimer = null;
function playPod(ch, gen, slot) {
  const plan = podPlan(ch.id, Math.round(slot.start), slot.it.d);
  let acc = 0, idx = 0;
  for (; idx < plan.length; idx++) { if (slot.offset < acc + plan[idx].dur) break; acc += plan[idx].dur; }
  clearTimeout(podTimer);
  podTimer = setTimeout(() => { if (gen === tuneGen) playSlot(ch, gen, 0); }, Math.max(300, (slot.it.d - slot.offset) * 1000 + 250)); // then straight into the next episode
  if (idx >= plan.length) return;
  const go = (i, off) => {
    if (gen !== tuneGen) return;
    v.onloadedmetadata = () => { if (gen === tuneGen && off > 0.5) v.currentTime = off; };
    v.onplaying = () => { if (gen === tuneGen) loadingOn(false); };
    v.onended = () => { if (i + 1 < plan.length) go(i + 1, 0); };
    v.onerror = () => { if (i + 1 < plan.length) go(i + 1, 0); };
    v.src = plan[i].url;
    v.play().catch(() => {});
  };
  loadingOn(false);
  go(idx, slot.offset - acc);
}

/* ---------- weather channel: our own screens over the smooth-jazz audio ---------- */
let wxData = null, wxExtra = null, wxPage = 0;
let wxLoc = null; // the ZIP code's coordinates, looked up once
async function wxQuery() {
  if (S.wxMode !== "zip" || !/^\d{5}$/.test(S.wxZip)) return "";
  if (!wxLoc || wxLoc.zip !== S.wxZip) {
    const r = await fetch("https://api.zippopotam.us/us/" + S.wxZip);
    if (!r.ok) throw new Error("zip not found");
    const p = (await r.json()).places[0];
    wxLoc = { zip: S.wxZip, lat: p.latitude, lon: p.longitude };
  }
  return "?lat=" + wxLoc.lat + "&lon=" + wxLoc.lon;
}
async function playWeather(ch, gen) {
  loadingOn(false);
  $("#wx").classList.add("on");
  $("#wxbody").textContent = "";
  playSlot({ id: "ia-retro-weather", kind: "ia" }, gen, 0); // the music
  loadingOn(false);
  let q = "";
  try { q = await wxQuery(); } catch { flash("ZIP NOT FOUND - USING AUTO"); }
  try { [wxData, wxExtra] = await Promise.all([jget("/api/weather" + q), jget("/api/weather/extra" + q).catch(() => null)]); } catch { /* keep going without */ }
  wxPage = 0;
  drawWx();
  wxTimer = setInterval(() => { wxPage++; drawWx(); }, 11000);
}
function wxPages() {
  const d = wxData, x = wxExtra;
  if (!d) return [() => ["LOCAL FORECAST", `<div class="sm">Getting the forecast...</div>`]];
  const p = d.periods || [];
  const pages = [
    () => ["CURRENT CONDITIONS", `<div class="big">${d.now.tempF}&deg;</div><div>${d.now.text}</div><div class="sm">Wind ${d.now.windDir || ""} ${d.now.windMph} mph &nbsp;|&nbsp; Humidity ${d.now.humidity ?? "--"}% &nbsp;|&nbsp; Pressure ${d.now.pressureIn ?? "--"} in &nbsp;|&nbsp; Visibility ${d.now.visibilityMi ?? "--"} mi</div><div class="sm">${d.city}, ${d.state}</div>`],
    () => ["LOCAL FORECAST", p.slice(0, 3).map((q) => `<div><span style="color:var(--yellow)">${q.name.toUpperCase()}</span><div class="sm">${q.detail}</div></div>`).join("")],
    () => ["EXTENDED FORECAST", p.slice(0, 8).map((q) => `<div class="row2"><span>${q.name.toUpperCase()}</span><span>${q.short}</span><span>${q.tempF}&deg;</span></div>`).join("")],
  ];
  if (x && x.cities && x.cities.length) pages.push(() => ["AROUND THE REGION", x.cities.slice(0, 8).map((c) => `<div class="row2"><span>${c.name.toUpperCase()}</span><span>${c.text}</span><span>${c.tempF}&deg; &nbsp; ${c.hi}/${c.lo}</span></div>`).join("")]);
  if (x && x.radar && x.radar.loop) pages.push(() => ["REGIONAL RADAR", `<img src="${x.radar.loop}" alt="radar">`]);
  if (x) pages.push(() => {
    const al = x.alerts || [];
    if (al.length) return ["WEATHER ALERTS", al.slice(0, 2).map((a) => `<div><span style="color:#ff6b6b">${(a.event || "ALERT").toUpperCase()}</span><div class="sm">${a.headline || ""}</div></div>`).join("")];
    const b = x.briefing;
    return [b && b.title ? "FORECAST DISCUSSION" : "WEATHER ALERTS", b && b.text ? `<div class="sm">${b.text}</div>` : `<div>NO ACTIVE ALERTS</div>`];
  });
  return pages;
}
function drawWx() {
  const pages = wxPages();
  const [title, html] = pages[wxPage % pages.length]();
  $("#wxtitle").textContent = title;
  $("#wxbody").innerHTML = html;
  $("#wxpage").textContent = `PAGE ${(wxPage % pages.length) + 1} OF ${pages.length}`;
  $("#wxclock").textContent = clock(Date.now());
}

/* ---------- our bumper clips over Pluto's looping placeholder ---------- */
let allClips = [];
async function loadClips() {
  try {
    const m = await jget("/clips/manifest.json");
    allClips = m.clips.map((c) => ({ id: c.id, type: c.type, dur: c.dur, url: BASE + "/clips/" + c.file }));
    allClips.forEach((c) => fetch(c.url).catch(() => {})); // warm the cache so a swap starts instantly
  } catch { allClips = []; }
}
function plan(seconds, used) {
  const cands = [];
  const clips = allClips.filter((c) => c.type !== "sponsor" || Math.random() < 0.1); // the "advertise here" house ad turns up about one break in four (0.1 per pick, three picks per break)
  const consider = (c) => {
    const diff = Math.abs(c.reduce((a, x) => a + x.dur, 0) - seconds);
    const reps = c.filter((x) => used.some((u) => u.id === x.id)).length;
    cands.push([diff + 0.4 * c.length + 6 * reps, c]);
  };
  for (const a of clips) { consider([a]); for (const b of clips) if (b !== a) { consider([a, b]); for (const c of clips) if (c !== a && c !== b) consider([a, b, c]); } }
  if (!cands.length) return [];
  const best = Math.min(...cands.map((x) => x[0]));
  const pool = cands.filter((x) => x[0] <= best + 2.5);
  const pick = pool[Math.floor(Math.random() * pool.length)][1].slice();
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  return pick; // nearly-best combinations are all fair game, in random order, so breaks vary
}

let swapActive = false, swapCap = null, swapCooldown = 0;
const slate = {
  sn: -1, asset: null, cc: -1, runSec: 0, prevRunSec: 0,
  reset() { this.sn = -1; this.asset = null; this.cc = -1; this.runSec = 0; this.prevRunSec = 0; },
  check(ch, details) {
    if (!details || !details.fragments) return;
    for (const f of details.fragments) {
      if (f.sn <= this.sn) continue; // only segments we have not seen
      this.sn = f.sn;
      const url = f.url || "";
      const a = url.indexOf("/clip/");
      const asset = a >= 0 ? url.slice(a + 6).split("/")[0] : url.includes("/sign/") ? "AD" : "OTHER";
      if (asset === this.asset && f.cc === this.cc) { this.runSec += f.duration; continue; } // still the same run of the same clip
      const placeholder = /ptv[_-]/i.test(asset);
      const prev = this.runSec;
      if (asset === this.asset && placeholder && f.cc > this.cc) { // the same Pluto placeholder starting again right after itself: a slate
        if (!swapActive && performance.now() >= swapCooldown) startSwap(Math.min(Math.max(prev, 2), 45));
      } else if (swapActive && !placeholder) {
        endSwap("real content");
      }
      this.asset = asset; this.cc = f.cc; this.runSec = f.duration;
    }
  },
};

function startSwap(loopSec) {
  if (!allClips.length || !hls) return;
  swapActive = true;
  loadingOn(false); showMsg("");
  const used = [], queue = [];
  for (let i = 0; i < 3; i++) { const p = plan(loopSec, used); queue.push(...p); used.push(...p); }
  v.pause();
  v.muted = true;
  v2.style.display = "block";
  v2.volume = v.volume;
  let n = 0;
  const next = () => { if (!swapActive) return; if (n >= queue.length) return endSwap("clips done"); v2.src = queue[n++].url; v2.play().catch(() => endSwap("clip error")); };
  v2.onended = next;
  v2.onerror = () => endSwap("clip error");
  next();
  clearTimeout(swapCap);
  swapCap = setTimeout(() => endSwap("90 s cap"), 90000);
  console.log("swap started, loop", loopSec.toFixed(1), "s,", queue.map((c) => c.id).join(","));
}
function endSwap(why, quiet) {
  if (!swapActive) return;
  swapActive = false;
  clearTimeout(swapCap);
  v2.onended = v2.onerror = null;
  v2.pause(); v2.removeAttribute("src"); v2.load(); v2.style.display = "none";
  swapCooldown = performance.now() + 20000;
  v.muted = muted;
  if (!quiet && hls) {
    try { hls.startLoad(-1); } catch { /* ignore */ }
    if (hls.liveSyncPosition) v.currentTime = hls.liveSyncPosition; // back to Pluto's live edge
    v.play().catch(() => {});
  }
  console.log("swap ended:", why);
}

/* ---------- anonymous usage: random id, version, minutes per channel ---------- */
const usage = (() => {
  let id = localStorage.getItem("bw-id");
  if (!id) { id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("bw-id", id); }
  const watched = {};
  let cur = null, since = 0;
  const flushCur = () => { if (cur && started) { const m = Math.round((Date.now() - since) / 60000); if (m > 0) { watched[cur] = (watched[cur] || 0) + m; since += m * 60000; } } };
  setInterval(() => {
    if (NDI_MODE || LTN.ltnOnly) return; // the hidden NDI copy is not a viewer, and LTN TV sends no usage statistics
    flushCur();
    const body = JSON.stringify({ id, p: "windows", v: VERSION, w: watched });
    fetch(BASE + "/api/ev", { method: "POST", headers: { "Content-Type": "application/json" }, body }).then(() => { for (const k of Object.keys(watched)) delete watched[k]; }).catch(() => {});
  }, 5 * 60000);
  return { switchTo(c) { flushCur(); cur = c; since = Date.now(); } };
})();

/* ---------- guide: time grid with a live preview ---------- */
const HALF = 1800, SPAN = 7200; // half-hour columns, two hours on screen
const floorHalf = (t) => Math.floor(t / HALF) * HALF;
const clockL = (sec) => { const d = new Date(sec * 1000); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + String(m).padStart(2, "0") + " " + ap; };
let gCh = 0, gCur = 0, gView = 0, gTop = 0; // selected channel index, selected moment, left edge of the grid, first visible row

const cumCache = {};
function cumFor(ch) {
  let c = cumCache[ch.id];
  if (c) return c;
  const items = schedules[ch.id].items;
  c = new Float64Array(items.length + 1);
  for (let i = 0; i < items.length; i++) c[i + 1] = c[i] + items[i].d;
  return (cumCache[ch.id] = c);
}
function itemAt(cum, pos) { let lo = 0, hi = cum.length - 2; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= pos) lo = mid; else hi = mid - 1; } return lo; }

// Programs on a channel between two times (seconds): [{s, e, t, sub}]. Breaks fold into the show before them and runs of short tracks become one block.
function programs(ch, from, to) {
  const filler = (a, b) => ({ s: a, e: b, t: ch.blurb || "Live programming", sub: "", filler: true });
  if (ch.kind === "weather") return [{ s: from, e: to, t: "WeatherStar Local Forecast", sub: "Radar, forecast and smooth jazz" }];
  if (ltnIsOwn(ch)) return ltnPrograms(ch, from, to);
  if (ch.kind === "pluto") {
    const out = []; let t = from;
    for (const p of epg[ch.pluto] || []) {
      if (p[1] <= from || p[0] >= to) continue;
      if (p[0] > t) out.push(filler(t, p[0]));
      out.push({ s: p[0], e: p[1], t: p[2], sub: p[3] || "" });
      t = Math.max(t, p[1]);
    }
    if (t < to) out.push(filler(t, to));
    return out;
  }
  const sc = schedules[ch.id];
  if (!sc || !sc.items.length) return [{ s: from, e: to, t: "LOADING GUIDE DATA...", sub: "" }];
  const cum = cumFor(ch), total = cum[cum.length - 1], anc = sc.anchor || anchor;
  const pos = (((from - anc) % total) + total) % total;
  let i = itemAt(cum, pos), start = from - (pos - cum[i]);
  const out = [];
  for (let guard = 0; start < to && guard < 4000; guard++) {
    const it = sc.items[i], end = start + it.d, last = out[out.length - 1];
    if (it.a) { if (last) last.e = end; else out.push({ s: start, e: end, t: "COMMERCIAL BREAK", sub: "" }); }
    else if (last && last.grp && it.d < 600 && last.e - last.s < 3600) { last.e = end; last.n++; last.sub = "+" + last.n + " more"; }
    else out.push({ s: start, e: end, t: it.t, sub: it.s != null && it.e != null ? "S" + it.s + " E" + it.e : "", grp: it.d < 600, n: 0 });
    start = end; i = (i + 1) % sc.items.length;
  }
  return out;
}

const minsText = (sec) => { const m = Math.max(1, Math.ceil(sec / 60)); return m >= 60 ? Math.floor(m / 60) + " hr" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min"; };

function renderGuide() {
  if (mode !== "guide") return;
  const rows = $("#grows");
  if (!rows || !channels.length) return;
  const now = Date.now() / 1000;
  if (gCur < now) gCur = now;
  const ve = gView + SPAN;
  // time header
  const ticks = $("#gticks"); ticks.textContent = "";
  for (let k = 0; k < SPAN / HALF; k++) { const sp = document.createElement("span"); sp.style.left = (k * HALF / SPAN * 100) + "%"; sp.textContent = clockL(gView + k * HALF); ticks.append(sp); }
  $("#gclock").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" }).toUpperCase();
  // rows
  const rh = window.innerHeight * 0.084, gap = window.innerHeight * 0.01;
  const list = chList();
  if (list.indexOf(gCh) < 0) gCh = list.find((i) => i >= gCh) ?? list[0]; // the highlighted channel left the (favorites) list
  const gp = list.indexOf(gCh);
  const per = Math.max(3, Math.floor((rows.clientHeight + gap) / (rh + gap)));
  if (gp < gTop) gTop = gp; else if (gp >= gTop + per) gTop = gp - per + 1;
  gTop = Math.max(0, Math.min(gTop, list.length - per));
  rows.textContent = "";
  let selProg = null;
  for (let pi = gTop; pi < Math.min(list.length, gTop + per); pi++) {
    const i = list[pi], ch = channels[i];
    const row = document.createElement("div"); row.className = "grow" + (i === tuned ? " cur" : "");
    const box = document.createElement("div"); box.className = "gch" + (isFav(ch.id) ? " fav" : "") + (isLive(ch) ? " onair" : "");
    box.innerHTML = "<b></b><span></span>"; box.firstChild.textContent = ch.num; box.lastChild.textContent = ch.name;
    box.onclick = () => { gCh = i; tune(i); setMode("tv"); };
    const track = document.createElement("div"); track.className = "gtrack";
    for (const p of programs(ch, gView, ve)) {
      const a = Math.max(p.s, gView), b = Math.min(p.e, ve);
      if (b <= a) continue;
      const blk = document.createElement("div");
      const sel = i === gCh && gCur >= p.s && gCur < p.e;
      blk.className = "blk" + (sel ? " sel" : "") + (p.s <= now && now < p.e ? " live" : "") + (p.s < gView ? " cont" : "") + (p.live ? " onair" : "");
      blk.style.left = ((a - gView) / SPAN * 100) + "%";
      blk.style.width = "calc(" + ((b - a) / SPAN * 100) + "% - .5vw)";
      const t = document.createElement("div"); t.className = "bt"; t.textContent = (p.s < gView ? "◂ " : "") + p.t;
      blk.append(t);
      if (p.sub) { const u = document.createElement("div"); u.className = "bs"; u.textContent = p.sub; blk.append(u); }
      blk.onclick = () => { if (sel) { tune(i); setMode("tv"); } else { gCh = i; gCur = Math.max(p.s, now); gAfter(); } };
      track.append(blk);
      if (sel) selProg = p;
    }
    row.append(box, track); rows.append(row);
  }
  if (!selProg) selProg = programs(channels[gCh], gCur, gCur + 1)[0];
  guideInfo(channels[gCh], selProg, now);
}
function guideInfo(ch, p, now) {
  if (!p) return;
  if (ltnIsOwn(ch) && !p.sched) { // channels without slots: say what is on, and whether it is live
    $("#gtitle").textContent = p.t;
    $("#gbar").style.display = "none";
    $("#gleft").textContent = p.live ? "\u25CF LIVE NOW" : "ALWAYS ON";
    $("#gmeta").textContent = [ch.num + "  " + ch.name, p.sub].filter(Boolean).join("  \u2022  ");
    $("#gdesc").textContent = ch.blurb || "";
    $("#gtags").textContent = (isFav(ch.id) ? "\u2605 FAVORITE" + (ch.cat ? "  \u2022  " : "") : "") + (ch.cat || "");
    return;
  }
  $("#gtitle").textContent = p.t;
  const live = now >= p.s && now < p.e;
  $("#gbar").style.display = live ? "block" : "none";
  if (live) $("#gbar").firstChild.style.width = Math.min(100, Math.max(0, (now - p.s) / (p.e - p.s) * 100)) + "%";
  $("#gleft").textContent = live ? minsText(p.e - now) + " left" : "Starts in " + minsText(p.s - now);
  $("#gmeta").textContent = [ch.num + "  " + ch.name, clockL(p.s) + " - " + clockL(p.e), minsText(p.e - p.s), p.sub && !p.filler && !p.sched ? p.sub : ""].filter(Boolean).join("  •  ");
  $("#gdesc").textContent = p.next ? "UP NEXT: " + p.next.t + "  \u2022  " + clockL(p.next.s) + " - " + clockL(p.next.e) : (p.filler ? "" : (ch.blurb || ""));
  $("#gtags").textContent = (isFav(ch.id) ? "\u2605 FAVORITE" + (ch.cat ? "  \u2022  " : "") : "") + (ch.cat || "");
}
function gFit() {
  const now = Date.now() / 1000;
  if (gCur < gView) gView = floorHalf(gCur);
  else if (gCur >= gView + SPAN) gView = floorHalf(gCur) - SPAN + HALF;
  if (gView < floorHalf(now)) gView = floorHalf(now);
}
function gAfter() { gFit(); renderGuide(); preview.request(channels[gCh]); syncOut(); }
function gMoveCh(d, wrap = true) {
  const list = chList(), n = list.length;
  const p = Math.max(0, list.indexOf(gCh));
  gCh = list[wrap ? (p + d + n) % n : Math.min(n - 1, Math.max(0, p + d))];
  gAfter();
}
function gMoveTime(dir) {
  const ch = channels[gCh], now = Date.now() / 1000;
  const p = programs(ch, gCur, gCur + 1)[0];
  if (!p) return;
  if (dir > 0) { if (p.e < now + 24 * 3600) gCur = p.e; }
  else if (p.s > now) { const q = programs(ch, p.s - 1, p.s)[0]; gCur = Math.max(q ? q.s : p.s - HALF, now); }
  gAfter();
}
function gNow() { gCur = Date.now() / 1000; gView = floorHalf(gCur); gAfter(); }
function setMode(m) {
  mode = m;
  $("#guide").classList.toggle("on", m === "guide");
  document.body.classList.toggle("gmode", m === "guide");
  if (m === "guide") {
    const now = Date.now() / 1000;
    gCh = tuned; gCur = now; gView = floorHalf(now); gTop = 0;
    $("#banner").classList.remove("on");
    renderGuide(); preview.request(channels[gCh]);
  } else preview.stop();
  syncOut();
}

/* live preview: the highlighted channel plays in the corner while you browse */
const preview = (() => {
  const pv = $("#pv"), msg = $("#gprevmsg");
  let timer = null, h = null, key = "", gen = 0;
  const clear = () => {
    clearTimeout(timer); gen++; key = "";
    if (h) { try { h.destroy(); } catch { /* gone */ } h = null; }
    pv.onplaying = pv.onerror = pv.onloadedmetadata = null;
    try { pv.pause(); } catch { /* ignore */ }
    pv.srcObject = null; pv.removeAttribute("src"); pv.load();
    msg.textContent = "";
    ltnPreviewClear();
  };
  async function start(ch) {
    const my = ++gen; pv.muted = true;
    try {
      if (ch.kind === "weather") { msg.textContent = "WEATHERSTAR\nLOCAL FORECAST"; return; }
      if (channels[tuned] === ch && v.captureStream && v.readyState >= 2 && !swapActive) { pv.srcObject = v.captureStream(); await pv.play(); if (my === gen) msg.textContent = ""; return; } // the channel already on: just mirror it
      if (ltnIsOwn(ch)) { ltnPreview(ch); return; }
      if (ch.kind === "pluto") {
        const url = await plutoUrl(ch.pluto, false);
        if (my !== gen) return;
        if (!Hls.isSupported()) throw new Error("no hls");
        h = new Hls({ maxBufferLength: 8, backBufferLength: 4, capLevelToPlayerSize: true, startLevel: 0, liveSyncDurationCount: 3, manifestLoadingMaxRetry: 1, levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 2 });
        h.on(Hls.Events.ERROR, (e, d) => { if (d.fatal && my === gen) msg.textContent = "NO SIGNAL"; });
        pv.onplaying = () => { if (my === gen) msg.textContent = ""; };
        h.loadSource(url); h.attachMedia(pv); pv.play().catch(() => {});
        return;
      }
      const slot = slotAt(ch, Date.now() / 1000);
      if (!slot) throw new Error("no slot");
      if (slot.it.a) { msg.textContent = "COMMERCIAL BREAK"; return; }
      if (bad.has(slot.it.u)) throw new Error("bad");
      pv.onloadedmetadata = () => { if (my === gen && slot.offset > 1 && slot.offset < (pv.duration || 1e9)) pv.currentTime = slot.offset; };
      pv.onplaying = () => { if (my === gen) msg.textContent = pv.videoWidth ? "" : "♪ " + slot.it.t; };
      pv.onerror = () => { if (my === gen) msg.textContent = "NO SIGNAL"; };
      pv.src = slot.it.u; pv.play().catch(() => {});
    } catch { if (my === gen) msg.textContent = "NO SIGNAL"; }
  }
  return {
    request(ch) { if (!ch || key === ch.id) return; clear(); key = ch.id; msg.textContent = "TUNING..."; timer = setTimeout(() => start(ch), 450); },
    stop: clear,
  };
})();

/* ---------- number entry ---------- */
let digits = "", digitTimer;
function typeDigit(d) {
  if (digits.length >= 3) digits = "";
  digits += d;
  const el = $("#digits"); el.textContent = digits; el.style.display = "block";
  clearTimeout(digitTimer);
  digitTimer = setTimeout(() => {
    const n = +digits; digits = ""; el.style.display = "none";
    const i = channels.findIndex((c) => c.num === n);
    if (i >= 0) { tune(i); if (mode === "guide") setMode("tv"); }
  }, channels.some((c) => String(c.num).startsWith(digits) && String(c.num) !== digits) ? (digits.length >= 2 ? 700 : 1800) : 300);
}

/* ---------- volume ---------- */
let muted = false;
function setVol(dv) {
  setS({ volume: Math.round(clamp01(S.volume + dv) * 100) / 100 });
  flash("VOLUME " + Math.round(S.volume * 100));
}
function toggleMute() { setS({ muteWindow: !S.muteWindow }); flash(S.muteWindow ? "MUTE" : "VOLUME " + Math.round(S.volume * 100)); }
v.volume = NDI_MODE ? 1 : 0.8; // replaced by the saved setting as soon as it loads

/* ---------- NDI output ---------- */
// The visible window only asks for NDI (D) and reports what it shows. The hidden 1920x1080 copy (?ndi=1) follows it, plays its own streams
// and taps its own audio, so NDI is always the fullscreen picture no matter how the visible window is sized or whether it is minimized.
let ndiOn = false, ndiCtx = null;
function syncOut(force) {
  if (NDI_MODE || (!ndiOn && !force) || !window.bw || !window.bw.ndiState) return;
  const ch = channels[tuned], gc = channels[gCh];
  window.bw.ndiState({ started, ch: ch && ch.id, mode, gch: gc && gc.id, gCur, gView, yt: ytSync(), live: ltnLiveSnap() });
}
async function toggleNdi() {
  if (!window.bw || !window.bw.ndiToggle) return flash("NDI: DESKTOP APP ONLY");
  flash(ndiOn ? "NDI STOPPING..." : "NDI STARTING...");
  await window.bw.ndiToggle(); // the answer arrives as an ndi-status event
}
if (!NDI_MODE && window.bw && window.bw.onNdiStatus) window.bw.onNdiStatus((r) => {
  ndiOn = !!r.on;
  if (r.error) { console.error("NDI:", r.error); flash("NDI UNAVAILABLE"); }
  else flash(ndiOn ? "NDI ON: " + (r.name || "LTN TV") : "NDI OFF");
  if (settingsOpen) renderSettings();
  if (ndiOn) syncOut(true);
});
async function ndiAudioStart() {
  v.crossOrigin = v2.crossOrigin = "anonymous"; // lets the audio graph read the media
  ndiCtx = new AudioContext({ sampleRate: 48000 });
  await ndiCtx.audioWorklet.addModule("ndi-worklet.js");
  const mix = ndiCtx.createGain();
  ndiCtx.createMediaElementSource(v).connect(mix);
  ndiCtx.createMediaElementSource(v2).connect(mix);
  const tap = new AudioWorkletNode(ndiCtx, "ndi-tap", { numberOfOutputs: 1, outputChannelCount: [2] });
  tap.port.onmessage = (e) => window.bw.ndiAudio(e.data, ndiCtx.sampleRate, 1024);
  mix.connect(tap); tap.connect(ndiCtx.destination); // the tap outputs silence; it only has to be in the graph to be pulled
}
function applySync(s) {
  if (!channels.length || !s || !s.started) return;
  const ti = channels.findIndex((c) => c.id === s.ch);
  if (!started) { if (ti >= 0) tuned = ti; begin(); }
  else if (ti >= 0 && ti !== tuned) tune(ti, true);
  if (s.mode !== mode) setMode(s.mode);
  ltnApplyLive(s.live);
  ytFollow(s.yt);
  if (s.mode === "guide") {
    const gi = channels.findIndex((c) => c.id === s.gch);
    if (gi >= 0) gCh = gi;
    gCur = s.gCur; gView = s.gView;
    renderGuide(); preview.request(channels[gCh]);
  }
}
async function initNdiWindow() {
  await bootP;
  if (!window.bw) return;
  await ndiAudioStart();
  window.bw.onNdiSync(applySync);
  window.bw.ndiReady();
}
if (!NDI_MODE && window.bw && window.bw.onNdiResend) window.bw.onNdiResend(() => syncOut(true));

/* ---------- settings menu ---------- */
let settingsOpen = false, sSel = 0, sTop = 0, sEdit = null;
const onoff = (b) => (b ? "ON" : "OFF");
const chNameOf = (num) => { const ch = channels.find((x) => x.num === num); return ch ? ch.name : ""; };
function wxChanged() { wxLoc = null; if (channels[tuned] && channels[tuned].kind === "weather") tune(tuned, false); }
function cycleStart(d) {
  const nums = [0, ...channels.map((x) => x.num)];
  const i = Math.max(0, nums.indexOf(S.startChannel));
  setS({ startChannel: nums[(i + d + nums.length) % nums.length] });
}
const settingRows = () => [
  { l: "VOLUME", v: () => Math.round(S.volume * 100) + "%", adj: (d) => setS({ volume: Math.round(clamp01(S.volume + d * 0.05) * 100) / 100 }) },
  { l: "MUTE WINDOW", v: () => onoff(S.muteWindow), tog: () => setS({ muteWindow: !S.muteWindow }) },
  { l: "NDI OUTPUT", v: () => onoff(ndiOn), tog: () => toggleNdi() },
  { l: "MUTE NDI AUDIO", v: () => onoff(S.muteNdi), tog: () => setS({ muteNdi: !S.muteNdi }) },
  { l: "START NDI WITH THE APP", v: () => onoff(S.ndiOnStart), tog: () => setS({ ndiOnStart: !S.ndiOnStart }) },
  { l: "NDI AUDIO OFFSET (MS, + = LATER)", v: () => (S.ndiAudioOffset > 0 ? "+" : "") + S.ndiAudioOffset, adj: (d) => setS({ ndiAudioOffset: Math.max(-1000, Math.min(1000, (S.ndiAudioOffset || 0) + d * 10)) }) },
  { l: "NDI SOURCE NAME", v: () => S.ndiName, edit: { init: () => S.ndiName, max: 32, set: (t) => setS({ ndiName: t.trim() || "LTN TV" }) } },
  { l: "START FULLSCREEN (NEXT LAUNCH)", v: () => onoff(S.startFullscreen), tog: () => setS({ startFullscreen: !S.startFullscreen }) },
  { l: "MINIMIZE TO TRAY", v: () => onoff(S.minimizeToTray), tog: () => setS({ minimizeToTray: !S.minimizeToTray }) },
  { l: "CLOSE BUTTON GOES TO TRAY", v: () => onoff(S.closeToTray), tog: () => setS({ closeToTray: !S.closeToTray }) },
  { l: "LAUNCH WITH WINDOWS", v: () => onoff(S.launchAtLogin), tog: () => setS({ launchAtLogin: !S.launchAtLogin }) },
  { l: "START CHANNEL", v: () => (S.startChannel ? S.startChannel + " " + chNameOf(S.startChannel) : "LAST WATCHED"), adj: cycleStart,
    edit: { init: () => String(S.startChannel || ""), digits: true, max: 3, set: (t) => { const n = +t; if (!t) return setS({ startChannel: 0 }); if (channels.some((x) => x.num === n)) setS({ startChannel: n }); else flash("NO SUCH CHANNEL"); } } },
  { l: "FAVORITES ONLY (GUIDE, UP/DOWN)", v: () => onoff(S.favOnly) + "  (" + S.favorites.length + " SAVED)", tog: () => setS({ favOnly: !S.favOnly }) },
  { l: "FAVORITE THE CURRENT CHANNEL", v: () => (channels[tuned] ? (isFav(channels[tuned].id) ? "★ YES" : "NO") : ""), tog: () => toggleFav(channels[tuned] && channels[tuned].id) },
  { l: "SPOTIFY PLAYLIST LINKS (LTN NEWS)", v: () => { const n = ltnSpotifyIds().length; return n + (n === 1 ? " PLAYLIST" : " PLAYLISTS") + (S.spotifyLinks ? " (YOURS)" : ""); }, edit: { init: () => S.spotifyLinks, max: 4000, set: (t) => { setS({ spotifyLinks: t.trim() }); ltnLoad(true).catch(() => {}).then(() => { if (channels[tuned] && channels[tuned].kind === "ltn") ltnDraw(); }); } } },
  { l: "TOGGLE FULLSCREEN NOW", v: () => "ENTER", tog: () => toggleFs() },
  { l: "CLOSE SETTINGS", v: () => "", tog: () => closeSettings() },
];
function renderSettings() {
  const rows = settingRows(), box = $("#srows");
  if (sSel >= rows.length) sSel = rows.length - 1;
  const rh = window.innerHeight * 0.066;
  const per = Math.max(5, Math.floor(box.clientHeight / rh));
  if (sSel < sTop) sTop = sSel; else if (sSel >= sTop + per) sTop = sSel - per + 1;
  sTop = Math.max(0, Math.min(sTop, rows.length - per));
  box.textContent = "";
  for (let i = sTop; i < Math.min(rows.length, sTop + per); i++) {
    const r = rows[i], el = document.createElement("div");
    el.className = "srow" + (i === sSel ? " sel" : "");
    const l = document.createElement("span"); l.className = "sl"; l.textContent = r.l;
    const val = document.createElement("span"); val.className = "sv";
    if (sEdit && i === sSel) {
      const inp = document.createElement("input");
      inp.value = sEdit.text; inp.maxLength = r.edit.max; inp.spellcheck = false;
      inp.oninput = () => { if (r.edit.digits) inp.value = inp.value.replace(/\D/g, ""); sEdit.text = inp.value; };
      val.append(inp);
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    } else val.textContent = r.v();
    el.append(l, val);
    el.onclick = () => { sSel = i; settingAct(0); };
    box.append(el);
  }
  $("#shelp").textContent = sEdit ? "TYPE THEN ENTER TO SAVE   ESC CANCEL" : "UP/DOWN SELECT   LEFT/RIGHT CHANGE   ENTER TOGGLE OR EDIT   S/ESC CLOSE";
  $("#sver").textContent = "v" + (window.bw && window.bw.version || "");
}
function settingAct(dir) { // dir: -1/+1 from arrows, 0 from Enter or a click
  const r = settingRows()[sSel];
  if (dir && r.adj) r.adj(dir);
  else if (dir && r.tog) r.tog();
  else if (!dir && r.edit) { sEdit = { text: r.edit.init() }; }
  else if (!dir && r.tog) r.tog();
  renderSettings();
}
function openSettings() { if (NDI_MODE) return; settingsOpen = true; sEdit = null; $("#settings").classList.add("on"); $("#banner").classList.remove("on"); renderSettings(); }
function closeSettings() { settingsOpen = false; sEdit = null; $("#settings").classList.remove("on"); }
function settingsKey(e) {
  const k = e.key, rows = settingRows();
  if (sEdit) {
    if (k === "Enter") { const r = rows[sSel], t = sEdit.text; sEdit = null; r.edit.set(t); renderSettings(); e.preventDefault(); }
    else if (k === "Escape") { sEdit = null; renderSettings(); e.preventDefault(); }
    return; // everything else types into the box
  }
  if (k === "ArrowUp") sSel = (sSel - 1 + rows.length) % rows.length;
  else if (k === "ArrowDown") sSel = (sSel + 1) % rows.length;
  else if (k === "ArrowLeft") return void (settingAct(-1), e.preventDefault());
  else if (k === "ArrowRight") return void (settingAct(1), e.preventDefault());
  else if (k === "Enter" || k === " ") return void (settingAct(0), e.preventDefault());
  else if (k === "Escape" || k === "Backspace" || k === "s" || k === "S") return void (closeSettings(), e.preventDefault());
  else return;
  renderSettings(); e.preventDefault();
}

/* ---------- input ---------- */
const toggleFs = () => (window.bw ? window.bw.fullscreen() : document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
function begin() {
  if (started || !channels.length) return;
  started = true;
  $("#start").style.display = "none";
  tune(tuned, true);
}
addEventListener("keydown", (e) => {
  if (!channels.length) return;
  if (!started) { begin(); e.preventDefault(); return; }
  if (settingsOpen) return settingsKey(e);
  const g = mode === "guide", k = e.key;
  if (/^[0-9]$/.test(k)) typeDigit(k);
  else if (k === "ArrowUp") g ? gMoveCh(-1) : surf(1);
  else if (k === "ArrowDown") g ? gMoveCh(1) : surf(-1);
  else if (k === "PageUp") g ? gMoveCh(-5, false) : surf(1);
  else if (k === "PageDown") g ? gMoveCh(5, false) : surf(-1);
  else if (k === "s" || k === "S") openSettings();
  else if (k === "h" || k === "H") toggleFav(g ? channels[gCh] && channels[gCh].id : channels[tuned] && channels[tuned].id);
  else if (k === "v" || k === "V") { setS({ favOnly: !S.favOnly }); flash(S.favOnly ? "FAVORITES ONLY" : "ALL CHANNELS"); }
  else if (k === "ArrowLeft") g ? gMoveTime(-1) : setVol(-0.05);
  else if (k === "ArrowRight") g ? gMoveTime(1) : setVol(0.05);
  else if ((k === "n" || k === "N") && g) gNow();
  else if (k === "Enter" || k === " ") { if (g) { tune(gCh); setMode("tv"); } else setMode("guide"); }
  else if (k === "g" || k === "G") setMode(g ? "tv" : "guide");
  else if (k === "i" || k === "I") banner();
  else if ((k === "d" || k === "D") && !NDI_MODE) toggleNdi();
  else if (k === "m" || k === "M") toggleMute();
  else if (k === "+" || k === "=") setVol(0.05);
  else if (k === "-" || k === "_") setVol(-0.05);
  else if (k === "f" || k === "F" || k === "F11") toggleFs();
  else if (k === "Escape" || k === "Backspace") { if (g) setMode("tv"); else if (window.bw && k === "Escape") toggleFs(); }
  else if (k === "q" || k === "Q") { if (window.bw) window.bw.quit(); }
  else return;
  e.preventDefault();
});
addEventListener("wheel", (e) => { if (!started) return; if (settingsOpen) { sSel = Math.max(0, Math.min(settingRows().length - 1, sSel + (e.deltaY > 0 ? 1 : -1))); renderSettings(); } else if (mode === "guide") gMoveCh(e.deltaY > 0 ? 1 : -1); else surf(e.deltaY > 0 ? -1 : 1); }, { passive: true });
document.addEventListener("click", (e) => { if (!started) return begin(); if (mode === "tv" && (e.target === v || e.target === v2 || e.target.closest("#wx"))) setMode("guide"); });
document.addEventListener("dblclick", toggleFs);
let idleT;
addEventListener("mousemove", () => { document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add("idle"), 2500); });
setInterval(() => { if (mode === "guide") { renderGuide(); if (ltnIsOwn(channels[gCh])) ltnPreview(channels[gCh]); } }, 15000);
setInterval(() => { if (!NDI_MODE && ndiOn) syncOut(); }, 5000); // keeps the NDI copy of the playlist in step
addEventListener("resize", () => mode === "guide" && renderGuide());
// test hook: press T on a Pluto channel to force a bumper swap as if a 25 s placeholder were looping
addEventListener("keydown", (e) => { if (e.shiftKey && (e.key === "T") && started && hls) startSwap(25); });
const bootP = boot().catch(() => { $("#start .go").textContent = "COULD NOT REACH THE CABLE COMPANY - CHECK YOUR INTERNET"; });
if (NDI_MODE) initNdiWindow();

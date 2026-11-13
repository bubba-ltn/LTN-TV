// Love Thy Nerd channels, added to the lineup on this PC only:
//   LTN LATEST      rotating pages: who is live, Twitch, the website's newest posts, new YouTube videos, every show's latest
//   LTN TWITCH      the Twitch stream when live, otherwise the trailer (or Twitch's own offline screen)
//   LTN DAILY BIBLE the LTN Daily Audio Bible playlist, played through in order
//   one channel per YouTube show: always on, joined mid-programme like a TV channel, and the live stream whenever the show is live
// Loaded before player.js; everything here is used at run time, after player.js has defined the helpers ($, channels, flash, clock, ...).
const LTN = {
  numLatest: 158, numTwitch: 159, numBible: 160, numShows: 161, // moved up automatically if the lineup already uses them
  site: "https://lovethynerd.com/feed",
  twitch: "lovethynerd",
  playsId: "UC8eB_7RaI0sKhVbo8abjhEw", // the LTN Plays channel (@LTNPlaysGames / @LoveThyNerd): LTN TWITCH shows what it is playing while we are not live
  // The stream schedule, weekly, in this time zone. day: 0 = Sunday ... 6 = Saturday. Twitch only gives its schedule to apps with a key, so it is kept here.
  schedule: { tz: "America/Chicago", slots: [
    { day: 5, at: "11:00", mins: 240, title: "Lunch Time Stream with Matt" },
    { day: 1, at: "11:00", mins: 60, title: "Lunch Time Stream with Matt" },
  ] },
  music: "IBC3x9Zyo-Q", // background music on LTN LATEST: audio only, from a 24/7 YouTube stream (NESTALGIA: Nintendo music for coding)
  bible: { playlist: "PLibAByUqZ70-6rRTHbRimCrxG7F-PCdSN", first: "QbDIEoXcMw8" },
  pageMs: 12000, refreshMs: 10 * 60000, livePollMs: 4 * 60000,
  // one channel each, in channel-number order (IDs from each channel page's canonical link)
  shows: [
    { id: "UC8eB_7RaI0sKhVbo8abjhEw", name: "LTN PLAYS GAMES", info: "LTN Plays Games, @LTNPlaysGames" },
    { id: "UCybQk4iV2Ax6cMLWsIO-sUw", name: "LOVE THY NERD", info: "@LoveThyNerd" },
    { id: "UCIdJqzOfkA4IUHC8RMM7SnA", name: "NCMU PODCAST", info: "Nerd Culture Ministry Underground, @NCMUpodcastLTN" },
    { id: "UC5FybvYjKGsMN_7f8M0YUMQ", name: "NERD HISTORY", info: "@NerdHistoryLTN" },
    { id: "UCXX-ABXIGaUW3_NmY7LOQGg", name: "RPG RUNDOWN", info: "The RPG Rundown, @TheRPGRundownLTN" },
    { id: "UC6yLOcIFpviSxE9c6d2Xpqg", name: "THE PULL LIST", info: "@ThePullListLTN" },
    { id: "UCiGN0i7cRwTLLv51DDMaM2w", name: "SAVE & CONTINUE", info: "Save & Continue Podcast, @SaveAndContinueLTN" },
    { id: "UCJ17-LAbqJhlWKr0yw2Jbzg", name: "CHRISTIAN BOARD GAMERS", info: "The Christian Board Gamers Podcast, @ChristianBoardGamersLTN" },
    { id: "UCjJEmqOToVh-jYDJePEBcvQ", name: "FAITH & FANDOM", info: "Faith & Fandom Podcast, @FaithAndFandomLTN" },
    { id: "UCda5tLEdzlfm3FtLi4rLQyA", name: "SATELLITE STORIES", info: "@SatelliteStoriesLTN" },
    { id: "UCTDE0NRt9QqeUByTE6WM0kQ", name: "TWO WORDS", info: "Two Words Podcast, @TwoWordsLTN" },
    { id: "UCT67V7nvgWuygXAORpiU7iA", name: "CHURCH NERDS", info: "@ChurchNerdsLTN" },
    { id: "UCXhCjTVjYof3F1tUfmem5hw", name: "BIBLE THUMP", info: "@BibleThumpLTN" },
  ],
};

function injectLtnChannels() {
  const free = (n) => { while (channels.some((c) => c.num === n)) n++; return n; };
  const add = (c) => { if (!channels.some((x) => x.id === c.id)) { c.cat = c.cat || "Love Thy Nerd"; channels.push(c); } };
  add({ id: "ltn-latest", num: free(LTN.numLatest), name: "LTN LATEST", kind: "ltn", blurb: "Who is live, and the newest from Love Thy Nerd: Twitch, the website and every YouTube show. Background music: 24/7 Nintendo music." });
  add({ id: "ltn-twitch", num: free(LTN.numTwitch), name: "LTN TWITCH", kind: "twitch", blurb: "twitch.tv/" + LTN.twitch + ": the live stream when we are on, the trailer when we are not." });
  add({ id: "ltn-bible", num: free(LTN.numBible), name: "LTN DAILY BIBLE", kind: "yt", yt: { list: LTN.bible.playlist, first: LTN.bible.first, wall: false }, blurb: "The LTN Daily Audio Bible playlist, played through in order." });
  let n = LTN.numShows;
  for (const s of LTN.shows) {
    n = free(n);
    add({ id: "ltn-yt-" + s.id, num: n, name: s.name, kind: "yt", ytid: s.id, yt: { list: "UULF" + s.id.slice(2), sched: true, wall: true, random: s.id === LTN.playsId }, blurb: s.info + " on YouTube: full videos only, no Shorts. Always on and shuffled, the same for everyone, and the live stream whenever the show is live." });
  }
  channels.sort((a, b) => a.num - b.num);
}

/* ---------- shared state ---------- */
let ltnData = null, ltnAt = 0, ltnPage = 0, ltnPageTimer = null, ltnRefreshTimer = null;
let ltnLiveMap = {}, ltnTw = null, ltnTunedLive = false, ltnTunedSig = "", ltnPollTimers = [], ltnNextTimer = null;
const ltnMirror = () => channels.find((x) => x.ytid === LTN.playsId); // the LTN Plays channel
// what is really playing: for LTN TWITCH while offline, that is the LTN Plays channel
const ltnPlayCh = () => { const ch = channels[tuned]; return ch && ch.kind === "twitch" && !isLive(ch) ? ltnMirror() || ch : ch; };
// everything that decides WHAT plays on a channel; when it changes the channel is re-tuned
function ltnSig(ch) {
  if (ch.kind === "twitch") { if (isLive(ch)) return "tw"; const m = ltnMirror(); return "off" + (m && isLive(m) ? "+yt" : ""); }
  return isLive(ch) ? "live" : "off";
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ltnTag = (el, tag) => { const n = el.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ""; };
const ltnIsOwn = (ch) => ch && (ch.kind === "ltn" || ch.kind === "yt" || ch.kind === "twitch");
function isLive(ch) {
  if (!ch) return false;
  if (ch.kind === "twitch") return !!(ltnTw && ltnTw.live);
  if (ch.kind === "yt" && ch.ytid) return !!(ltnLiveMap[ch.ytid] && ltnLiveMap[ch.ytid].live);
  return false;
}

/* ---------- Shorts are ignored everywhere ---------- */
const ytShortCache = new Map();
async function ytIsShort(id) {
  if (!id) return false;
  if (ytShortCache.has(id)) return ytShortCache.get(id);
  let short = false;
  try { const r = await fetch("https://www.youtube.com/shorts/" + id, { method: "HEAD", redirect: "follow", cache: "no-store" }); short = /\/shorts\//.test(r.url); } catch { short = false; } // cannot tell: treat as a normal video
  ytShortCache.set(id, short);
  return short;
}

/* ---------- data pulls ---------- */
async function ltnXml(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return new DOMParser().parseFromString(await r.text(), "text/xml");
}
async function ltnYoutube() {
  const out = [], shows = [];
  await Promise.allSettled(LTN.shows.map(async (s) => {
    const doc = await ltnXml("https://www.youtube.com/feeds/videos.xml?playlist_id=UULF" + s.id.slice(2));
    const show = ltnTag(doc.getElementsByTagName("author")[0] || doc.documentElement, "name") || s.name;
    let vids = [...doc.getElementsByTagName("entry")].slice(0, 5).map((e) => ({ id: ltnTag(e, "yt:videoId"), t: ltnTag(e, "title"), at: Date.parse(ltnTag(e, "published")) || 0, show, cid: s.id }));
    out.push(...vids);
    if (vids[0]) shows.push(vids[0]);
  }));
  if (!out.length) throw new Error("no youtube data");
  out.sort((a, b) => b.at - a.at); shows.sort((a, b) => b.at - a.at);
  return { videos: out, shows };
}
async function ltnSite() {
  const doc = await ltnXml(LTN.site);
  return [...doc.getElementsByTagName("item")].slice(0, 6).map((it) => {
    const body = ltnTag(it, "content:encoded") || ltnTag(it, "description");
    const img = (body.match(/src="(https:[^"]+?\.(?:jpe?g|png|webp)[^"]*)"/i) || [])[1] || "";
    const text = ltnTag(it, "description").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/The post .* appeared first on .*$/i, "").trim();
    return { t: ltnTag(it, "title"), at: Date.parse(ltnTag(it, "pubDate")) || 0, by: ltnTag(it, "dc:creator"), cat: ltnTag(it, "category"), img, text: text.slice(0, 220) };
  });
}
async function ltnTwitch() {
  const g = (p) => fetch("https://decapi.me/twitch/" + p + "/" + LTN.twitch, { cache: "no-store" }).then((r) => r.text()).then((t) => t.trim());
  const [uptime, title, game] = await Promise.all([g("uptime"), g("title").catch(() => ""), g("game").catch(() => "")]);
  return { live: !!uptime && !/offline|not found|error|unavailable/i.test(uptime), uptime, title, game };
}
// Is this YouTube channel live? Its /live page names a watch link only while a stream is on. The page is huge, so stop reading once we know.
async function ytLive(id) {
  const ctl = new AbortController();
  const r = await fetch("https://www.youtube.com/channel/" + id + "/live", { signal: ctl.signal, cache: "no-store", headers: { "Accept-Language": "en-US" } });
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const m = /rel="canonical" href="([^"]*)"/.exec(buf);
      if (m) {
        const w = /watch\?v=([\w-]{11})/.exec(m[1]);
        if (!w) return { live: false }; // canonical is the channel page: nothing live
        if (/"isLive":true/.test(buf)) { const t = /<title>([^<]*)<\/title>/.exec(buf); return { live: true, vid: w[1], title: t ? t[1].replace(/ - YouTube$/, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'") : "" }; }
        if (buf.length > m.index + 150000) return { live: false }; // a watch page that is not live: an old stream
      }
      if (buf.length > 1500000) break;
    }
  } finally { ctl.abort(); }
  return { live: false };
}
async function ltnLoad(force) {
  if (!force && ltnData && Date.now() - ltnAt < LTN.refreshMs) return;
  const [yt, site, tw] = await Promise.allSettled([ltnYoutube(), ltnSite(), ltnTwitch()]);
  ltnData = { yt: yt.value || (ltnData && ltnData.yt) || null, site: site.value || (ltnData && ltnData.site) || null };
  if (tw.value) ltnTw = tw.value;
  ltnAt = Date.now();
}
const ltnLiveSnap = () => ({ yt: ltnLiveMap, tw: ltnTw ? { live: !!ltnTw.live, title: ltnTw.title, game: ltnTw.game, uptime: ltnTw.uptime } : null });
function ltnApplyLive(s) { // the hidden NDI copy receives this from the visible window
  if (!s) return;
  const before = JSON.stringify(ltnLiveSnap());
  ltnLiveMap = s.yt || {}; if (s.tw) ltnTw = { ...(ltnTw || {}), ...s.tw };
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
function ltnLiveChanged() {
  if (mode === "guide") renderGuide();
  const ch = channels[tuned];
  if (started && ltnIsOwn(ch) && ch.kind !== "ltn" && ltnSig(ch) !== ltnTunedSig) tune(tuned, false); // went live or ended: switch what is playing
  syncOut();
}
async function ltnLivePoll() {
  const before = JSON.stringify(ltnLiveSnap());
  try { ltnTw = await ltnTwitch(); } catch { /* keep the last answer */ }
  await Promise.allSettled(LTN.shows.map(async (s) => { try { ltnLiveMap[s.id] = await ytLive(s.id); } catch { /* keep the last answer */ } }));
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
// the channel being watched is checked more often, so going live or ending is noticed within a minute or two
async function ltnPollTuned() {
  const ch = channels[tuned];
  if (!started || !ltnIsOwn(ch)) return;
  const before = JSON.stringify(ltnLiveSnap());
  try {
    if (ch.kind === "twitch") { ltnTw = await ltnTwitch(); if (!ltnTw.live && ltnMirror()) ltnLiveMap[LTN.playsId] = await ytLive(LTN.playsId); }
    else if (ch.kind === "yt" && ch.ytid) ltnLiveMap[ch.ytid] = await ytLive(ch.ytid);
  } catch { return; }
  if (JSON.stringify(ltnLiveSnap()) !== before) ltnLiveChanged();
}
function ltnStart() { // called once the lineup is known (visible window only: the NDI copy is told what is live)
  if (NDI_MODE) return;
  ltnLoad(false).catch(() => {});
  ltnLivePoll();
  setTimeout(ltnWarm, 20000);
  ltnPollTimers.push(setInterval(ltnLivePoll, LTN.livePollMs), setInterval(ltnPollTuned, 75000));
}

/* ---------- what the guide, banner and preview say about these channels ---------- */
function ytNowTitle() { return (ytInfo.videoData && ytInfo.videoData.title) || ""; }
function ltnNow(ch) {
  const live = isLive(ch);
  if (ch.kind === "twitch") return live ? { t: "\u25CF LIVE: " + ((ltnTw && ltnTw.title) || "on Twitch"), n: (ltnTw && ltnTw.game) || "" } : { t: (channels[tuned] === ch && ytNowTitle()) || "LTN Plays", n: ltnNextText() || "twitch.tv/" + LTN.twitch };
  if (ch.kind === "yt") {
    if (live) return { t: "● LIVE: " + (ltnLiveMap[ch.ytid].title || ch.name), n: "" };
    const lst = ch.ytid && ch.yt.sched && ltnLists[ch.ytid];
    if (lst && lst.sched && lst.sched.order.length) { const a = schedAt(lst.sched, Date.now() / 1000); return { t: a.it.title || ch.name, n: "Up next: " + (a.next.title || "") }; }
    const cur = channels[tuned] === ch ? ytNowTitle() : "";
    return { t: cur || (ch.ytid ? ch.name + " on YouTube" : "LTN Daily Audio Bible"), n: ch.ytid ? "Always on" : "Played through in order" };
  }
  return { t: "The newest from Love Thy Nerd", n: "" };
}
function ltnPrograms(ch, from, to) {
  const l = ltnNow(ch);
  return [{ s: from, e: to, t: l.t, sub: l.n, live: isLive(ch) }];
}
function ltnPreviewClear() { const i = $("#gprevimg"); if (i) { i.style.display = "none"; i.removeAttribute("src"); } }
function ltnPreview(ch) { // a picture for the guide's preview box
  if (ch.kind === "twitch" && !isLive(ch) && ltnMirror()) ch = ltnMirror(); // offline: it shows the LTN Plays channel
  const img = $("#gprevimg"), msg = $("#gprevmsg");
  let src = "";
  if (ch.kind === "twitch" && isLive(ch)) src = "https://static-cdn.jtvnw.net/previews-ttv/live_user_" + LTN.twitch + "-640x360.jpg?t=" + Math.floor(Date.now() / 30000);
  else if (ch.kind === "yt" && ch.ytid) {
    const lv = ltnLiveMap[ch.ytid];
    const v = ltnData && ltnData.yt && ltnData.yt.videos.find((x) => x.cid === ch.ytid);
    if (lv && lv.live) src = "https://i.ytimg.com/vi/" + lv.vid + "/hqdefault_live.jpg";
    else if (v) src = "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg";
  } else if (ch.kind === "yt") src = "https://i.ytimg.com/vi/" + LTN.bible.first + "/mqdefault.jpg";
  if (src) { img.onerror = () => { img.style.display = "none"; }; img.src = src; img.style.display = "block"; }
  msg.textContent = (isLive(ch) ? "● LIVE  " : "") + (src ? "" : ch.name);
  msg.style.alignItems = src ? "flex-end" : "center";
}

/* ---------- LTN LATEST pages ---------- */
const ago = (at) => {
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  if (m < 60) return m + " MIN AGO";
  const h = Math.round(m / 60); if (h < 48) return h + " HR" + (h > 1 ? "S" : "") + " AGO";
  const d = Math.round(h / 24); return d < 60 ? d + " DAYS AGO" : Math.round(d / 30) + " MONTHS AGO";
};
function ltnPages() {
  const d = ltnData, pages = [];
  pages.push(() => {
    const live = channels.filter((c) => ltnIsOwn(c) && c.kind !== "ltn" && isLive(c));
    return ["LIVE NOW", live.length ? live.map((c) => `<div class="lrow"><span class="lrs">CH ${c.num}  ${esc(c.name)}</span><span class="lrt">${esc(ltnNow(c).t)}</span><span class="lra">&#9679; LIVE</span></div>`).join("") : `<div class="lmsg">Nothing is live right now.<br><span class="lsub">twitch.tv/${esc(LTN.twitch)}</span></div>`];
  });
  if (ltnTw) pages.push(() => {
    const t = ltnTw;
    const img = t.live ? `<img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${LTN.twitch}-1280x720.jpg?t=${Math.floor(Date.now() / 60000)}" onerror="this.style.visibility='hidden'">` : `<div class="loff">OFFLINE</div>`;
    return ["TWITCH", `<div class="ltw"><div class="ltwimg">${img}</div><div class="ltwtxt"><div class="lstat ${t.live ? "live" : ""}">${t.live ? "&#9679; LIVE NOW" : "NOT LIVE RIGHT NOW"}</div><div class="ltitle">${esc(t.title || "")}</div><div class="lsub">${esc([t.game, t.live && t.uptime ? "live for " + t.uptime : ""].filter(Boolean).join("  •  "))}</div><div class="lsub">twitch.tv/${esc(LTN.twitch)}</div></div></div>`];
  });
  if (d && d.site && d.site.length) for (let i = 0; i < d.site.length; i += 3) pages.push(() => ["LOVETHYNERD.COM", d.site.slice(i, i + 3).map((p) => `<div class="lpost">${p.img ? `<img src="${esc(p.img)}" onerror="this.style.display='none'">` : ""}<div class="lptxt"><div class="lpt">${esc(p.t)}</div><div class="lps">${esc([p.cat, p.by, ago(p.at)].filter(Boolean).join("  •  "))}</div><div class="lpx">${esc(p.text)}</div></div></div>`).join("")]);
  if (d && d.yt) {
    const vids = d.yt.videos.slice(0, 18);
    for (let i = 0; i < vids.length; i += 6) pages.push(() => ["NEW ON YOUTUBE", `<div class="lgrid">${vids.slice(i, i + 6).map((v) => `<div class="lc"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" onerror="this.style.visibility='hidden'"><div class="lct">${esc(v.t)}</div><div class="lcs">${esc(v.show)}  •  ${ago(v.at)}</div></div>`).join("")}</div>`]);
    for (let i = 0; i < d.yt.shows.length; i += 6) pages.push(() => ["OUR SHOWS", d.yt.shows.slice(i, i + 6).map((v) => `<div class="lrow"><span class="lrs">${esc(v.show)}</span><span class="lrt">${esc(v.t)}</span><span class="lra">${ago(v.at)}</span></div>`).join("")]);
  }
  return pages;
}
function ltnDraw() {
  const pages = ltnPages();
  const [title, html] = pages[ltnPage % pages.length]();
  $("#ltntitle").textContent = title;
  $("#ltnbody").innerHTML = html;
  $("#ltnpage").textContent = "PAGE " + ((ltnPage % pages.length) + 1) + " OF " + pages.length;
  $("#ltnclock").textContent = clock(Date.now());
}
async function playLtn(ch, gen) {
  loadingOn(false);
  $("#ltn").classList.add("on");
  ltnPage = 0; ltnDraw();
  if (!NDI_MODE && LTN.music) { // the music: always playing, sound only
    const m = $("#ytm");
    m.onload = () => ytAudioSoon();
    m.src = ytEmbed(LTN.music + "?playlist=" + LTN.music);
  }
  const reload = async (force) => { try { await ltnLoad(force); } catch { /* keep what we have */ } if (gen === tuneGen) ltnDraw(); };
  await reload(false);
  if (gen !== tuneGen) return;
  ltnPageTimer = setInterval(() => { ltnPage++; ltnDraw(); }, LTN.pageMs);
  ltnRefreshTimer = setInterval(() => reload(true), LTN.refreshMs);
}

/* ---------- the shared schedule: every show channel is always on, shuffled, and the same for everyone ---------- */
// The channel's newest 100 videos (with their lengths) are put in a fixed pseudo-random order that depends only on the channel and the video ids,
// then played back to back on a loop that starts at a fixed moment. What is on, and how far in, is therefore a function of the clock alone:
// anyone tuning in at the same time sees the same thing, in the shuffled order, with no server involved.
const SCHED_ANCHOR = 1767225600; // 1 Jan 2026 00:00 UTC: where the loop starts
const SCHED_EPOCH = 6 * 3600;    // everyone refreshes the video list at the same UTC moments (00:00, 06:00, 12:00, 18:00)
const ltnLists = {}, ltnListLoading = {};
let ytSched = null, ytSchedCtx = null, ytSchedActive = false, ytCtl = null, ytLoadAt = 0, ytBad = new Set();
const ltnSchedOn = (ch) => !!(ch && ch.kind === "yt" && ch.yt && ch.yt.sched && ytSchedActive);
function ltnHash(str) { // 32-bit FNV-1a with a finishing mix
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
// the first 100 videos of a playlist page: [{id, len (seconds), title}]
async function ltnFetchList(listId) {
  const toSec = (t) => t.split(":").reduce((a, x) => a * 60 + +x, 0);
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("https://www.youtube.com/playlist?list=" + listId, { cache: "no-store", headers: { "Accept-Language": "en-US" } });
      const html = await r.text();
      const m = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html);
      if (!m) throw new Error("no list data");
      const out = [];
      (function walk(o) {
        if (!o || typeof o !== "object") return;
        const l = o.lockupViewModel;
        if (l && l.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && l.contentId) {
          const badges = [];
          (function w(x) { if (!x || typeof x !== "object") return; if (x.thumbnailBadgeViewModel) badges.push(x.thumbnailBadgeViewModel.text); for (const k in x) w(x[k]); })(l);
          const t = badges.find((b) => /^\d+(:\d+)+$/.test(b || ""));
          const title = (l.metadata && l.metadata.lockupMetadataViewModel && l.metadata.lockupMetadataViewModel.title && l.metadata.lockupMetadataViewModel.title.content) || "";
          if (t) out.push({ id: l.contentId, len: toSec(t), title });
        }
        for (const k in o) walk(o[k]);
      })(JSON.parse(m[1]));
      if (!out.length) throw new Error("empty list");
      return out;
    } catch (e) { lastErr = e; await new Promise((res) => setTimeout(res, 1500)); }
  }
  throw lastErr;
}
function ltnBuildSchedule(items, seed) {
  // sorted by a hash of (channel, video): adding or removing one video only inserts or removes it; everything else keeps its place
  const order = items.map((it) => ({ ...it, k: ltnHash(seed + ":" + it.id) })).sort((a, b) => a.k - b.k || (a.id < b.id ? -1 : 1));
  let acc = 0;
  for (const it of order) { it.start = acc; acc += it.len; }
  return { order, total: acc, items, seed };
}
function schedAt(sch, nowSec) { // what is on at this moment: {it, offset, index, next}
  const pos = (((nowSec - SCHED_ANCHOR) % sch.total) + sch.total) % sch.total;
  let lo = 0, hi = sch.order.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sch.order[mid].start <= pos) lo = mid; else hi = mid - 1; }
  const it = sch.order[lo];
  return { it, offset: pos - it.start, index: lo, next: sch.order[(lo + 1) % sch.order.length] };
}
async function ltnVerifyList(ch, items) {
  let doc;
  try { doc = await ltnXml("https://www.youtube.com/feeds/videos.xml?playlist_id=" + ch.yt.list); } catch { return; } // cannot check right now: accept
  const entries = [...doc.getElementsByTagName("entry")];
  if (!entries.length) return;
  if (entries.some((e) => { const c = ltnTag(e, "yt:channelId"); return c && c !== ch.ytid; })) throw new Error("this list belongs to another channel");
  const ids = new Set(items.map((x) => x.id));
  if (!entries.some((e) => ids.has(ltnTag(e, "yt:videoId")))) throw new Error("this list does not match the channel's own feed");
}
async function ltnGetSchedule(ch) {
  const ep = Math.floor(Date.now() / 1000 / SCHED_EPOCH), id = ch.ytid;
  const have = ltnLists[id];
  if (have && have.epoch === ep) return have.sched;
  if (ltnListLoading[id]) return ltnListLoading[id];
  ltnListLoading[id] = (async () => {
    try {
      let items = null;
      // a saved copy is only trusted if it was saved for exactly this channel and playlist, and it is checked again like a fresh list
      try { const c = JSON.parse(localStorage.getItem("ltn-list-" + id) || "null"); if (c && c.epoch === ep && c.id === id && c.list === ch.yt.list && c.items && c.items.length) items = c.items; } catch { /* no saved copy */ }
      if (items) { try { await ltnVerifyList(ch, items); } catch { items = null; try { localStorage.removeItem("ltn-list-" + id); } catch { /* ignore */ } } } // a bad saved copy is thrown away
      if (!items) {
        items = await ltnFetchList(ch.yt.list);
        await ltnVerifyList(ch, items); // never schedule another channel's videos
        try { localStorage.setItem("ltn-list-" + id, JSON.stringify({ epoch: ep, id, list: ch.yt.list, items })); } catch { /* storage full or blocked */ }
      }
      const sched = ltnBuildSchedule(items.filter((x) => !ytBad.has(x.id)), id);
      ltnLists[id] = { epoch: ep, sched };
      return sched;
    } catch { return have ? have.sched : null; } // keep the last list if refreshing fails
    finally { delete ltnListLoading[id]; }
  })();
  return ltnListLoading[id];
}
async function ltnWarm() { // load every channel's list in the background (one at a time) so the guide can name what is on
  for (const c of channels.filter((x) => x.kind === "yt" && x.yt && x.yt.sched)) {
    try { await ltnGetSchedule(c); if (mode === "guide") renderGuide(); } catch { /* next one */ }
    await new Promise((r) => setTimeout(r, 3500));
  }
}

/* ---------- YouTube channels and the Daily Bible: YouTube's embedded player ---------- */
let ytJumpVid = "", ytRecent = [];
let ytInfo = {}, ytListenTimer = null, ytPos = 0, twPlayer = null, ytLastVid = "", ytWant = -1, ytVidAtCmd = "", ytFollowVid = 0;
const ytEmbed = (path) => "https://www.youtube-nocookie.com/embed/" + path + (path.includes("?") ? "&" : "?") + "autoplay=1&loop=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1&cc_load_policy=0&enablejsapi=1";
function ytCmd(func, args) {
  const f = $("#ytf");
  if (f && f.contentWindow && /youtube/.test(f.getAttribute("src") || "")) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
}
function ytmCmd(func, args) {
  const f = $("#ytm");
  if (f && f.contentWindow && /youtube/.test(f.getAttribute("src") || "")) f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
}
let ytSent = {}; // what each player was last told
function ytAudio(force) { // follow the window's volume and mute (the hidden NDI copy is always silent here: YouTube's player cannot be captured for NDI audio)
  const quiet = !!(NDI_MODE || S.muteWindow), vol = Math.round(Math.min(1, Math.max(0, S.volume)) * 100), key = quiet + ":" + vol;
  const tell = (name, ready, cmd) => { if (!ready || (!force && ytSent[name] === key)) return; ytSent[name] = key; cmd(quiet ? "mute" : "unMute"); cmd("setVolume", [vol]); };
  tell("ytm", /youtube/.test($("#ytm").getAttribute("src") || ""), ytmCmd);
  tell("ytf", /youtube/.test($("#ytf").getAttribute("src") || ""), ytCmd);
  tell("tw", !!twPlayer, (func, args) => { try { if (func === "setVolume") twPlayer.setVolume(args[0] / 100); else twPlayer.setMuted(func === "mute"); } catch { /* not ready yet */ } });
}
function ytNoCaptions() { for (const m of ["captions", "cc"]) { ytCmd("unloadModule", [m]); ytmCmd("unloadModule", [m]); } }
const ytAudioSoon = () => { ytSent = {}; for (const ms of [1200, 3500, 8000]) setTimeout(() => { ytAudio(true); ytNoCaptions(); }, ms); }; // a freshly loaded player needs telling a few times until it is ready
function ytShow(src, gen) {
  const f = $("#ytf");
  $("#yt").classList.add("on");
  f.onload = () => {
    let n = 0;
    clearInterval(ytListenTimer);
    ytAudioSoon();
    ytListenTimer = setInterval(() => { // asks the player to report what it is playing, until it does
      if (gen !== tuneGen || ++n > 60 || ytInfo.currentTime != null) return clearInterval(ytListenTimer);
      try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch { /* frame gone */ }
    }, 1000);
  };
  f.src = src;
}
function playYt(ch, gen, owner) { // owner: the channel being watched, when it is borrowing this one's programme
  loadingOn(false);
  ytInfo = {}; ytPos = 0; ytWant = -1; ytVidAtCmd = ""; ytJumpVid = ""; ytRecent = [];
  ltnTunedLive = isLive(ch); ltnTunedSig = ltnSig(owner || ch);
  clearInterval(ytCtl); ytCtl = null; ytSched = null; ytSchedActive = false;
  if (ltnTunedLive) return ytShow(ytEmbed("live_stream?channel=" + ch.ytid), gen);
  if (ch.yt.sched) { // the shared shuffled schedule; if the list cannot be loaded, fall back to the plain playlist
    loadingOn(true);
    ltnGetSchedule(ch).then((sch) => {
      if (gen !== tuneGen) return;
      loadingOn(false);
      if (!sch || !sch.order.length) return ytLegacy(ch, gen);
      ytSched = sch; ytSchedCtx = ch; ytSchedActive = true;
      const a = schedAt(sch, Date.now() / 1000);
      ytLoadAt = Date.now();
      ytShow(ytEmbed(a.it.id + "?start=" + Math.floor(a.offset)), gen);
      ytCtl = setInterval(() => ytTick(ch, gen), 1000);
    }).catch(() => { if (gen === tuneGen) { loadingOn(false); ytLegacy(ch, gen); } });
    return;
  }
  ytLegacy(ch, gen);
}
function ytLegacy(ch, gen) { // the plain playlist (the Daily Bible, or a show whose list could not be loaded)
  ytShow(ytEmbed(ch.yt.first ? ch.yt.first + "?list=" + ch.yt.list : "videoseries?list=" + ch.yt.list), gen);
}
// every second: is the player showing what the clock says should be on? If not, put it right.
function ytTick(ch, gen) {
  if (gen !== tuneGen || !ytSched || !ytSchedActive) { clearInterval(ytCtl); ytCtl = null; return; }
  const a = schedAt(ytSched, Date.now() / 1000), cur = ytInfo.videoData && ytInfo.videoData.video_id, since = Date.now() - ytLoadAt;
  if (cur == null || ytInfo.currentTime == null) { // the player has not reported anything: after a while, load it again
    if (since > 20000) { ytLoadAt = Date.now(); ytShow(ytEmbed(a.it.id + "?start=" + Math.floor(a.offset)), gen); }
    return;
  }
  if (cur !== a.it.id) { // the next programme has started (or the player is on something else): go to it, part-way in if need be
    if (since > 3500) { ytLoadAt = Date.now(); ytCmd("loadVideoById", [a.it.id, Math.floor(a.offset)]); }
    return;
  }
  if ((ytInfo.playerState === -1 || ytInfo.playerState === 5) && since > 15000) { ytLoadAt = Date.now(); ytCmd("loadVideoById", [a.it.id, Math.floor(a.offset)]); return; } // stuck before playing
  if (ytInfo.playerState === 1 && since > 15000 && Math.abs(ytInfo.currentTime - a.offset) > 8) { ytLoadAt = Date.now(); ytCmd("seekTo", [a.offset, true]); } // drifted
}
// a video that cannot be played (removed, or embedding switched off): leave it out of the schedule
function ytOnError() {
  const cur = ytInfo.videoData && ytInfo.videoData.video_id;
  if (!ytSchedActive || !ytSched || !cur) return;
  ytBad.add(cur);
  const rest = ytSched.items.filter((x) => !ytBad.has(x.id));
  if (!rest.length) return;
  ytSched = ltnBuildSchedule(rest, ytSched.seed);
  if (ytSchedCtx && ltnLists[ytSchedCtx.ytid]) ltnLists[ytSchedCtx.ytid].sched = ytSched;
}
// a show channel is "already on": pick the programme from the wall clock so everyone (and the NDI copy) sees the same thing, and join part-way in
const ytHash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function ytPosition() {
  const ch = ltnPlayCh();
  if (NDI_MODE || !ch || ch.kind !== "yt" || !ch.yt.wall || ltnTunedLive || ytPos === 2 || ltnSchedOn(ch)) return;
  const pl = ytInfo.playlist;
  if (!Array.isArray(pl) || !pl.length) return;
  const now = Date.now() / 1000, slot = 4 * 3600;
  if (ch.yt.random) { // shuffled: start at a random video and a random point in it
    if (ytPos === 0) {
      ytPos = 1;
      ytWant = Math.floor(Math.random() * pl.length);
      ytVidAtCmd = (ytInfo.videoData && ytInfo.videoData.video_id) || "";
      ytCmd("playVideoAt", [ytWant]);
      return;
    }
    if (ytPos === 1 && ytInfo.playlistIndex === ytWant && ytInfo.videoData && ytInfo.videoData.video_id !== ytVidAtCmd && ytInfo.duration > 5) {
      ytCmd("seekTo", [Math.random() * ytInfo.duration * 0.7, true]);
      ytPos = 2;
    }
    return;
  }
  // in order: the clock picks the programme (same for everyone) and the player carries on down the list from there
  const n = Math.min(pl.length, 40);
  const want = (ytHash(ch.ytid) + Math.floor(now / slot)) % n;
  if (ytPos === 0) { ytPos = 1; if (ytInfo.playlistIndex !== want) { ytCmd("playVideoAt", [want]); return; } }
  if (ytPos === 1 && ytInfo.playlistIndex === want && ytInfo.videoData && ytInfo.videoData.video_id === pl[want] && ytInfo.duration > 5) {
    const off = (now % slot) % ytInfo.duration;
    ytCmd("seekTo", [off > ytInfo.duration - 30 ? 0 : off, true]);
    ytPos = 2;
  }
}
addEventListener("message", (e) => {
  if (!/youtube/.test(e.origin || "")) return;
  let d = e.data;
  try { if (typeof d === "string") d = JSON.parse(d); } catch { return; }
  if (d && d.event === "onError") ytOnError();
  if (d && (d.event === "infoDelivery" || d.event === "initialDelivery") && d.info) {
    Object.assign(ytInfo, d.info);
    if (d.info.videoData) {
      ytInfo.videoData = { ...(ytInfo.videoData || {}), ...d.info.videoData };
      const vid = d.info.videoData.video_id;
      if (vid && vid !== ytLastVid) { ytLastVid = vid; setTimeout(ytNoCaptions, 600); setTimeout(ytNoCaptions, 2500); ytSkipIfShort(vid); }
    }
    ytPosition();
    ytAdvance();
  }
});
function ytAdvance() {
  const ch = ltnPlayCh();
  if (NDI_MODE || !ch || ch.kind !== "yt" || ltnTunedLive || ltnSchedOn(ch)) return;
  if (ch.yt.wall && ytPos !== 2) return; // still joining part-way through
  const d = ytInfo.duration, t = ytInfo.currentTime, pl = ytInfo.playlist, vid = ytInfo.videoData && ytInfo.videoData.video_id, cur = ytInfo.playlistIndex;
  if (!(d > 20) || t == null || !Array.isArray(pl) || pl.length < 2 || !vid || cur == null || ytJumpVid === vid) return;
  if (!ytRecent.includes(vid)) ytRecent.push(vid);
  if (d - t > 2.5) return;
  ytJumpVid = vid; // once per video
  if (ytRecent.length > Math.min(8, pl.length - 1)) ytRecent.shift();
  ytGo(cur, pl, !!ch.yt.random);
}
// Play the next video: the next one down the list (back to the top at the end), or a random one for the shuffled channel. Shorts are passed over.
async function ytGo(cur, pl, random) {
  const tried = new Set([cur]);
  for (let k = 0; k < 15; k++) {
    let i;
    if (random) {
      i = -1;
      for (let n = 0; n < 20; n++) { const c = Math.floor(Math.random() * pl.length); if (!tried.has(c) && !ytRecent.includes(pl[c])) { i = c; break; } }
      if (i < 0) { do { i = Math.floor(Math.random() * pl.length); } while (tried.has(i) && tried.size < pl.length); }
    } else i = (cur + 1 + k) % pl.length;
    if (tried.has(i)) continue;
    tried.add(i);
    if (await ytIsShort(pl[i])) continue;
    return ytCmd("playVideoAt", [i]);
  }
  ytCmd("playVideoAt", [(cur + 1) % pl.length]); // everything we looked at was a Short: just carry on
}
// a video that starts and turns out to be a Short (the playlist moved on by itself, or the clock picked it): skip it at once
async function ytSkipIfShort(vid) {
  const ch = ltnPlayCh();
  if (NDI_MODE || !ch || ch.kind !== "yt" || ltnTunedLive || !(await ytIsShort(vid))) return;
  if (!ytInfo.videoData || ytInfo.videoData.video_id !== vid) return; // already moved on
  const pl = ytInfo.playlist, cur = ytInfo.playlistIndex;
  if (Array.isArray(pl) && pl.length > 1 && cur != null) ytGo(cur, pl, !!ch.yt.random);
}
// the visible window reports where the playlist is; the hidden NDI copy follows it
const ytSync = () => (ltnPlayCh() && ltnPlayCh().kind === "yt" && !ltnSchedOn(ltnPlayCh()) && ytInfo.playlistIndex != null ? { idx: ytInfo.playlistIndex, t: ytInfo.currentTime || 0, vid: (ytInfo.videoData && ytInfo.videoData.video_id) || "" } : undefined);
let ytFollowAt = 0;
function ytFollow(y) {
  const ch = ltnPlayCh();
  if (!y || !ch || ch.kind !== "yt" || ltnTunedLive || ltnSchedOn(ch)) return;
  if (ytInfo.playlistIndex == null || ytInfo.currentTime == null) return; // the copy has not reported yet: do not guess
  if (ch.yt.random) { // shuffled: play the same video at the same point
    const mine = (ytInfo.videoData && ytInfo.videoData.video_id) || "";
    if (y.vid && mine !== y.vid) { if (Date.now() - ytFollowVid > 8000) { ytFollowVid = Date.now(); ytFollowAt = Date.now(); ytCmd("loadVideoById", [y.vid, y.t]); } return; }
  } else if (ytInfo.playlistIndex !== y.idx && Date.now() - ytFollowAt >= 30000) { ytFollowAt = Date.now(); ytCmd("playVideoAt", [y.idx]); return; }
  if (Date.now() - ytFollowAt < 30000) return; // at most one correction every 30 s
  if (Math.abs(ytInfo.currentTime - y.t) > 15) { ytFollowAt = Date.now(); ytCmd("seekTo", [y.t, true]); }
}

/* ---------- Twitch: the live stream, or the trailer while offline ---------- */
function ltnTwitchLib() {
  return window.Twitch && window.Twitch.Player ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://player.twitch.tv/js/embed/v1.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
}
// ---- when is the next live stream (weekly schedule above, shown in this PC's time zone) ----
function ltnTzOffset(ts, tz) { // minutes east of UTC at that moment
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, +x.value]));
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000) / 60000;
}
function ltnNextStream(now = Date.now()) { // the next stream that has not started yet: {start, end, title}
  const { tz, slots } = LTN.schedule;
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(now)).map((x) => [x.type, +x.value]));
  const base = Date.UTC(p.year, p.month - 1, p.day);
  let best = null;
  for (let d = -1; d <= 8; d++) {
    const day = new Date(base + d * 86400000);
    for (const s of slots) {
      if (s.day !== day.getUTCDay()) continue;
      const [h, m] = s.at.split(":").map(Number);
      const wall = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m);
      let start = wall - ltnTzOffset(wall, tz) * 60000;
      start = wall - ltnTzOffset(start, tz) * 60000; // once more, in case the clocks change that day
      const end = start + s.mins * 60000;
      if (start > now && (!best || start < best.start)) best = { start, end, title: s.title }; // only streams that have not started yet
    }
  }
  return best;
}
function ltnNextText() {
  const n = ltnNextStream();
  if (!n) return "";
  const now = Date.now(), fmt = (ts, o) => new Date(ts).toLocaleString(undefined, o);
  const zone = fmt(n.start, { timeZoneName: "short" }).split(" ").pop();
  const time = fmt(n.start, { hour: "numeric", minute: "2-digit" });
  const sd = new Date(n.start).toDateString();
  const when = sd === new Date(now).toDateString() ? "TODAY" : sd === new Date(now + 864e5).toDateString() ? "TOMORROW" : fmt(n.start, { weekday: "long" }).toUpperCase();
  return ("NEXT STREAM: " + when + " " + time + " " + zone + (n.title ? "  •  " + n.title : "")).toUpperCase();
}
function ltnNextShow(on) { // the note in the top-left corner
  clearInterval(ltnNextTimer); ltnNextTimer = null;
  const el = $("#nextlive");
  if (!el) return;
  if (!on) { el.classList.remove("on"); return; }
  const draw = () => { const t = ltnNextText(); el.textContent = t; el.classList.toggle("on", !!t); };
  draw(); ltnNextTimer = setInterval(draw, 30000);
}
async function playTwitch(ch, gen) {
  loadingOn(false);
  ytInfo = {};
  const m = isLive(ch) ? null : ltnMirror();
  if (m) { playYt(m, gen, ch); ltnNextShow(true); return; } // not live: whatever LTN Plays is showing, plus when we are next on
  ltnNextShow(false);
  ltnTunedLive = true; ltnTunedSig = ltnSig(ch);
  $("#tw").classList.add("on");
  try { await ltnTwitchLib(); } catch { return flash("TWITCH UNAVAILABLE"); }
  if (gen !== tuneGen) return;
  $("#twp").textContent = "";
  // the player only runs on a page whose host is in "parent"; the app serves itself from http://localhost for exactly this
  twPlayer = new Twitch.Player("twp", { channel: LTN.twitch, parent: ["localhost"], width: "100%", height: "100%", autoplay: true, muted: false });
  twPlayer.addEventListener(Twitch.Player.READY, () => { try { twPlayer.play(); } catch { /* player gone */ } });
  ytAudioSoon();
}

function ltnStop() {
  clearInterval(ytCtl); ytCtl = null; ytSched = null; ytSchedActive = false;
  ltnNextShow(false);
  clearInterval(ltnPageTimer); clearInterval(ltnRefreshTimer); clearInterval(ytListenTimer);
  ltnPageTimer = ltnRefreshTimer = ytListenTimer = null;
  twPlayer = null;
  const l = $("#ltn"), y = $("#yt"), t = $("#tw"), m = $("#ytm");
  if (m && /youtube/.test(m.getAttribute("src") || "")) m.src = "about:blank";
  if (l) l.classList.remove("on");
  if (t) { t.classList.remove("on"); const p = $("#twp"); if (p) p.textContent = ""; }
  if (y) { y.classList.remove("on"); const f = $("#ytf"); if (f && /youtube/.test(f.getAttribute("src") || "")) f.src = "about:blank"; }
}

/* ---------- keep the picture still, and leave a trail if something moves it ---------- */
(() => {
  let n = 0;
  const diag = (...a) => { if (n++ < 300) console.error("DIAG", NDI_MODE ? "ndi" : "window", ...a); };
  // nothing here should ever scroll; if it does, say so and put it back at once
  addEventListener("scroll", () => { diag("scroll", window.scrollX, window.scrollY, document.documentElement.scrollLeft, document.body.scrollLeft); window.scrollTo(0, 0); document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; }, true);
  if (window.visualViewport) for (const ev of ["scroll", "resize"]) visualViewport.addEventListener(ev, () => diag("visualViewport", ev, Math.round(visualViewport.offsetLeft), Math.round(visualViewport.offsetTop), Math.round(visualViewport.width), Math.round(visualViewport.height)));
  addEventListener("DOMContentLoaded", () => {
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver((es) => es.forEach((e) => diag("resize", e.target.id || e.target.tagName, Math.round(e.contentRect.width), Math.round(e.contentRect.height))));
    for (const id of ["ytf", "twp", "yt", "tw", "ltn"]) { const el = document.getElementById(id); if (el) ro.observe(el); }
    ro.observe(document.documentElement);
  });
})();
